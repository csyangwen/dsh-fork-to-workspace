/**
 * dsh-fork-to-workspace 宿主端冒烟测试。
 *
 * 按 dsh-plugin skill §8 验证模板：构造 fake ctx（inject 直接回调、fake
 * sessions/sessionPersistence/workspaceRegistry/agents/agentPresets/
 * sessionTitle/webServer），用真实 node:http 服务器转发注册的 handler，
 * 覆盖 prepare / fork 全链路与边界（无已完成回合、atSeq 锚点、目标工作区
 * 校验、标题自增）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { apply } from '../lib/index.js'

/** 生成一段包含两个已完成回合 + 一个标题事件的会话事件序列。 */
function makeEvents(withTitle = true) {
  const events = [
    { seq: 0, type: 'turn/start', data: { turn: 1 } },
    { seq: 1, type: 'user/message', data: { content: [{ type: 'text', text: '第一问' }] } },
    { seq: 2, type: 'assistant/message', data: { content: [{ type: 'text', text: '第一答' }] } },
    { seq: 3, type: 'turn/end', data: { turn: 1 } },
    { seq: 4, type: 'turn/start', data: { turn: 2 } },
    { seq: 5, type: 'user/message', data: { content: [{ type: 'text', text: '第二问' }] } },
    { seq: 6, type: 'assistant/message', data: { content: [{ type: 'text', text: '第二答' }] } },
    { seq: 7, type: 'turn/end', data: { turn: 2 } },
  ]
  if (withTitle) {
    events.push({ seq: 8, type: 'session/title', data: { title: '质量会话', messageSeqs: [], source: { kind: 'user' } } })
  }
  return events
}

/** 构造 fake 宿主上下文（服务全部按名从 get() 读取）。 */
function makeCtx() {
  const liveSessions = new Map()
  const workspaces = [
    {
      id: 'ws-source', title: '项目A', path: '/tmp/project-a',
      sessionIds: [], attachSession(id) { this.sessionIds.unshift(id) },
    },
    {
      id: 'ws-target', title: '项目B', path: '/tmp/project-b',
      sessionIds: [], attachSession(id) { this.sessionIds.unshift(id) },
    },
  ]
  const created = []
  const renamed = []
  const mounted = []
  const ctx = {
    _liveSessions: liveSessions,
    _workspaces: workspaces,
    _created: created,
    _renamed: renamed,
    _mounted: mounted,
    _handler: null,
    get(name) {
      switch (name) {
        case 'sessions': return {
          get(id) { return liveSessions.get(id) },
        }
        case 'sessionPersistence': return {
          async list() {
            return [...liveSessions.values()].map(s => s.header)
          },
          async inspect(id) {
            const session = liveSessions.get(id)
            if (session === undefined) throw new Error(`no session ${id}`)
            return { meta: session.header, events: session.events }
          },
        }
        case 'workspaceRegistry': return {
          list() { return workspaces },
          get(id) { return workspaces.find(w => w.id === id) },
        }
        case 'agents': return {
          async create(opts) {
            created.push(opts)
            // 真实 agent-loop 会在发布前 await setup（preset mount 等），fake 对齐。
            if (typeof opts.setup === 'function') {
              await opts.setup({ agent: { id: opts.sessionId } })
            }
            const header = {
              id: opts.sessionId, version: 0, createdAt: 0, cwd: opts.meta?.cwd,
              parentSession: opts.meta?.parentSession, seedLength: opts.meta?.seedLength,
              agentPreset: opts.meta?.agentPreset,
            }
            liveSessions.set(opts.sessionId, { id: opts.sessionId, header, events: [...opts.seed] })
            return { agent: { id: opts.sessionId, session: liveSessions.get(opts.sessionId) } }
          },
          get(id) { return { id, session: liveSessions.get(id) } },
        }
        case 'agentPresets': return {
          // fake 预设目录（与真实 agentPresets.list() 投影对齐）：
          // standard=系统内置默认；anchored-standard=本地自建；broken-one=配置损坏。
          async list() {
            return [
              { id: 'standard', trust: 'system', name: '标准模式', path: '/p/standard' },
              { id: 'anchored-standard', trust: 'user', name: '锚定标准', path: '/p/anchored-standard' },
              { id: 'broken-one', trust: 'user', broken: 'agent.cordis.yml 解析失败', path: '/p/broken-one' },
            ]
          },
          get defaultId() { return 'standard' },
          async resolve(id) { return { id: id ?? 'default' } },
          async mount(agentCtx, id) { mounted.push({ id, hasCtx: Boolean(agentCtx) }) },
        }
        case 'sessionTitle': return {
          rename(session, title) {
            renamed.push({ id: session.id, title })
            session.events.push({ seq: session.events.length, type: 'session/title', data: { title, messageSeqs: [], source: { kind: 'user' } } })
            return { title }
          },
        }
        case 'webServer': return ctx.webServer
        default: return undefined
      }
    },
    inject(names, cb) { return cb(ctx) },
  }
  // 真实 cordis 中服务同时以 ctx 属性暴露（webCtx.webServer），fake 补上。
  ctx.webServer = {
    register(route) {
      ctx._handler = route.handler
      return () => { ctx._handler = null }
    },
  }
  return ctx
}

/** 起一个真实 HTTP 服务转发插件 handler，返回 base URL 与关闭函数。 */
async function serve(handler) {
  const server = createServer((req, res) => {
    handler(req, res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) }
}

/** 统一请求助手：GET/POST + JSON。 */
async function request(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, json: await res.json() }
}

/** 挂载一个 live 源会话到 fake 环境。 */
function seedSource(ctx, id = 'session-source') {
  const events = makeEvents()
  const header = { id, version: 0, createdAt: 0, cwd: '/tmp/project-a', agentPreset: undefined }
  ctx._liveSessions.set(id, { id, header, events })
  ctx._workspaces[0].sessionIds.unshift(id)
  return { id, events, header }
}

test('apply 注册 webServer 路由', () => {
  const ctx = makeCtx()
  apply(ctx)
  assert.equal(typeof ctx._handler, 'function')
})

test('prepare 返回源会话信息与工作区列表', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'GET', '/dsh-fork-ws/prepare?sessionId=session-source')
    assert.equal(res.status, 200)
    assert.equal(res.json.ok, true)
    assert.equal(res.json.source.title, '质量会话')
    assert.equal(res.json.source.workspaceId, 'ws-source')
    assert.deepEqual(res.json.workspaces.map(w => w.workspaceId), ['ws-source', 'ws-target'])
  } finally {
    await server.close()
  }
})

test('fork 到目标工作区：种子=最后已完成回合、cwd=目标路径、挂载、标题自增', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-target',
    })
    assert.equal(res.status, 200)
    assert.equal(res.json.ok, true)
    const childId = res.json.childId
    assert.match(childId, /^session-/)
    // 创建参数：cwd=目标工作区路径，种子=截至最后一个 turn/end（含标题事件）。
    const create = ctx._created[0]
    assert.equal(create.meta.cwd, '/tmp/project-b')
    assert.equal(create.meta.parentSession, 'session-source')
    assert.equal(create.meta.seedLength, 9)
    assert.equal(create.seed.length, 9)
    assert.equal(create.seed.at(-1).type, 'session/title')
    assert.deepEqual(create.seed.slice(0, 4).map(e => e.type), ['turn/start', 'user/message', 'assistant/message', 'turn/end'])
    // 挂载到目标工作区。
    assert.ok(ctx._workspaces[1].sessionIds.includes(childId))
    assert.ok(!ctx._workspaces[0].sessionIds.includes(childId))
    // 标题自增。
    assert.deepEqual(ctx._renamed, [{ id: childId, title: '质量会话 (1)' }])
    // preset 挂载走 agentPresets 服务。
    assert.deepEqual(ctx._mounted, [{ id: 'default', hasCtx: true }])
  } finally {
    await server.close()
  }
})

test('fork 带 atSeq 锚点：种子截到锚点所在回合', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-target', atSeq: 1,
    })
    assert.equal(res.json.ok, true)
    const create = ctx._created[0]
    // 第一个 seq>=1 的 turn/end 是 seq 3 → 种子 0..3。
    assert.equal(create.seed.length, 4)
    assert.equal(create.seed.at(-1).type, 'turn/end')
  } finally {
    await server.close()
  }
})

test('fork 无 workspaceId：默认源会话所属工作区', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source',
    })
    assert.equal(res.json.ok, true)
    assert.equal(ctx._created[0].meta.cwd, '/tmp/project-a')
  } finally {
    await server.close()
  }
})

test('fork 无已完成回合：返回 fork-unavailable', async () => {
  const ctx = makeCtx()
  apply(ctx)
  const id = 'session-empty'
  ctx._liveSessions.set(id, {
    id, header: { id, version: 0, createdAt: 0, cwd: '/tmp/project-a' },
    events: [{ seq: 0, type: 'turn/start', data: { turn: 1 } }],
  })
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: id, workspaceId: 'ws-target',
    })
    assert.equal(res.status, 200)
    assert.equal(res.json.ok, false)
    assert.equal(res.json.code, 'fork-unavailable')
  } finally {
    await server.close()
  }
})

test('fork 源会话已在目标工作区：拒绝', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-source',
    })
    assert.equal(res.json.ok, false)
    assert.equal(res.json.code, 'source-in-target')
  } finally {
    await server.close()
  }
})

test('fork 未知会话 / 未知工作区：友好错误', async () => {
  const ctx = makeCtx()
  apply(ctx)
  const server = await serve(ctx._handler)
  try {
    const missing = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-ghost', workspaceId: 'ws-target',
    })
    assert.equal(missing.json.ok, false)
    assert.equal(missing.json.code, 'session-not-found')
    const badWs = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-ghost',
    })
    assert.equal(badWs.json.ok, false)
    assert.equal(badWs.json.code, 'workspace-not-found')
  } finally {
    await server.close()
  }
})

test('冷会话（仅持久化）也可作为源分叉', async () => {
  const ctx = makeCtx()
  apply(ctx)
  // 只放进持久化层（不挂 live）。
  const id = 'session-cold'
  const events = makeEvents(false)
  ctx._liveSessions.set(id, {
    id, header: { id, version: 0, createdAt: 0, cwd: '/tmp/project-a' }, events,
  })
  ctx._workspaces[0].sessionIds.unshift(id)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: id, workspaceId: 'ws-target',
    })
    assert.equal(res.json.ok, true)
    assert.equal(ctx._created[0].meta.cwd, '/tmp/project-b')
    // 无标题事件 → 不重命名。
    assert.deepEqual(ctx._renamed, [])
  } finally {
    await server.close()
  }
})

test('prepare 返回可选预设列表（含 trust/name/broken/isDefault）与源会话 presetId', async () => {
  const ctx = makeCtx()
  apply(ctx)
  // 源会话带 header.agentPreset（anchored-standard）。
  const id = 'session-source'
  const events = makeEvents()
  ctx._liveSessions.set(id, {
    id,
    header: { id, version: 0, createdAt: 0, cwd: '/tmp/project-a', agentPreset: 'anchored-standard' },
    events,
  })
  ctx._workspaces[0].sessionIds.unshift(id)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'GET', '/dsh-fork-ws/prepare?sessionId=session-source')
    assert.equal(res.status, 200)
    assert.equal(res.json.ok, true)
    // 源会话当前预设：header 有值且事件里无 selected → 取 header。
    assert.equal(res.json.source.presetId, 'anchored-standard')
    // 预设列表：三个 fake 预设，字段投影完整。
    assert.deepEqual(res.json.presets, [
      { id: 'standard', trust: 'system', name: '标准模式', isDefault: true },
      { id: 'anchored-standard', trust: 'user', name: '锚定标准', isDefault: false },
      { id: 'broken-one', trust: 'user', broken: 'agent.cordis.yml 解析失败', isDefault: false },
    ])
  } finally {
    await server.close()
  }
})

test('fork 换预设：meta.agentPreset 为新值，种子 selected 事件被改写（不污染源）', async () => {
  const ctx = makeCtx()
  apply(ctx)
  // 源会话事件里带一条 agent-preset/selected（anchored-standard），header 同值。
  const id = 'session-source'
  const events = makeEvents()
  events.splice(0, 0, { seq: 0, type: 'agent-preset/selected', time: 1, data: { agentPreset: 'anchored-standard' } })
  events.forEach((e, i) => { e.seq = i })
  ctx._liveSessions.set(id, {
    id,
    header: { id, version: 0, createdAt: 0, cwd: '/tmp/project-a', agentPreset: 'anchored-standard' },
    events,
  })
  ctx._workspaces[0].sessionIds.unshift(id)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: id, workspaceId: 'ws-target', agentPreset: 'standard',
    })
    assert.equal(res.json.ok, true)
    const create = ctx._created[0]
    // meta 记录新预设；mount 用新预设。
    assert.equal(create.meta.agentPreset, 'standard')
    assert.deepEqual(ctx._mounted, [{ id: 'standard', hasCtx: true }])
    // 种子里的 selected 事件被改写为新预设（其余事件原样）。
    const selected = create.seed.filter(e => e.type === 'agent-preset/selected')
    assert.equal(selected.length, 1)
    assert.equal(selected[0].data.agentPreset, 'standard')
    assert.equal(create.seed[1].type, 'turn/start')
    // 源会话未被污染：事件对象是共享引用，改写必须产出新对象。
    assert.equal(ctx._liveSessions.get(id).events[0].data.agentPreset, 'anchored-standard')
  } finally {
    await server.close()
  }
})

test('fork 换预设且源无 selected 事件：种子末尾追加一条', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-target', agentPreset: 'anchored-standard',
    })
    assert.equal(res.json.ok, true)
    const create = ctx._created[0]
    assert.equal(create.meta.agentPreset, 'anchored-standard')
    // 末尾追加 selected 事件，seq 顺延（源种子末 seq=8 → 9）。
    const tail = create.seed.at(-1)
    assert.equal(tail.type, 'agent-preset/selected')
    assert.equal(tail.data.agentPreset, 'anchored-standard')
    assert.equal(tail.seq, 9)
    // seedLength 仍是源事件长度（追加事件不计入边界）。
    assert.equal(create.meta.seedLength, 9)
  } finally {
    await server.close()
  }
})

test('fork 换预设：预设不存在 / 配置损坏 → 友好错误，不创建会话', async () => {
  const ctx = makeCtx()
  apply(ctx)
  seedSource(ctx)
  const server = await serve(ctx._handler)
  try {
    const missing = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-target', agentPreset: 'ghost-preset',
    })
    assert.equal(missing.json.ok, false)
    assert.equal(missing.json.code, 'preset-not-found')
    const broken = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: 'session-source', workspaceId: 'ws-target', agentPreset: 'broken-one',
    })
    assert.equal(broken.json.ok, false)
    assert.equal(broken.json.code, 'preset-broken')
    assert.match(broken.json.error, /解析失败/)
    // 校验失败发生在创建之前，不应有任何会话被创建。
    assert.equal(ctx._created.length, 0)
  } finally {
    await server.close()
  }
})

test('fork 不传 agentPreset：保持源会话预设（事件优先）', async () => {
  const ctx = makeCtx()
  apply(ctx)
  const id = 'session-source'
  const events = makeEvents()
  events.splice(0, 0, { seq: 0, type: 'agent-preset/selected', time: 1, data: { agentPreset: 'anchored-standard' } })
  events.forEach((e, i) => { e.seq = i })
  ctx._liveSessions.set(id, {
    id,
    header: { id, version: 0, createdAt: 0, cwd: '/tmp/project-a', agentPreset: 'standard' },
    events,
  })
  ctx._workspaces[0].sessionIds.unshift(id)
  const server = await serve(ctx._handler)
  try {
    const res = await request(server.base, 'POST', '/dsh-fork-ws/fork', {
      sessionId: id, workspaceId: 'ws-target',
    })
    assert.equal(res.json.ok, true)
    const create = ctx._created[0]
    // 事件里最新 selected 是 anchored-standard（优先于 header 的 standard）。
    assert.equal(create.meta.agentPreset, 'anchored-standard')
    // 未显式换预设 → 种子原样，selected 事件未被改写。
    assert.equal(create.seed[0].data.agentPreset, 'anchored-standard')
  } finally {
    await server.close()
  }
})
