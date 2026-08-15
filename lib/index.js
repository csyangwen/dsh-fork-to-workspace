/**
 * dsh-fork-to-workspace — 宿主端。
 *
 * 提供两个 Web API（挂在 `webServer` 服务的 `/dsh-fork-ws` 前缀下），供浏览器
 * 端「分叉会话到其他工作区」功能调用：
 *
 *   GET  /dsh-fork-ws/prepare?sessionId=<id>
 *     → { ok, source: { sessionId, title, workspaceId }, workspaces: [...] }
 *     对话框打开时一次性取「源会话信息 + 现有工作区列表」。
 *
 *   POST /dsh-fork-ws/fork   body: { sessionId, workspaceId?, atSeq? }
 *     → { ok, childId } | { ok: false, error }
 *     把源会话截至指定边界（atSeq 锚定的已完成回合；缺省=最后一个已完成回合）
 *     的事件种子克隆成一个新会话，并把新会话挂到目标工作区（cwd = 工作区路径，
 *     通过官方 workspace.attachSession 的 canonical-cwd 校验），标题自动
 *     追加序号（与官方分叉一致），随后子会话保持 live（浏览器端打开它）。
 *
 * 实现要点（与官方 /api/session.fork 语义对齐，见 api-proxy.ts fork）：
 * - 会话归属工作区的唯一判据是「会话 header.cwd 的 canonical 路径 === 工作区
 *   path」，所以跨工作区分叉的本质 = 创建子会话时把 meta.cwd 设为目标工作区
 *   路径，再 attachSession。
 * - 边界逻辑逐行复刻官方：atSeq 取「第一个 seq >= atSeq 的 turn/end」；缺省或
 *   越界取最后一个 turn/end；其后顺延穿过所有非 turn/start 的尾部事件。
 * - preset 组合走 `agentPresets` 服务（与官方 composeAgent 同款）；模型参数取
 *   源会话最后一个 request/header 的 config（与官方 selectionFor 的 log 优先
 *   级一致）；标题自增走 `sessionTitle` 服务。
 *
 * 另外提供**会话导出 / 导入**（官方只有导出 RPC 且无界面、无导入）：
 *
 *   GET  /dsh-fork-ws/export?sessionId=<id>
 *     → 下载 zip（session.jsonl + media/*，官方同款格式）
 *   POST /dsh-fork-ws/import?workspaceId=<id>   body = zip 字节
 *     → { ok, sessionId, eventsImported, attachmentsImported, warnings }
 *     解析 zip → 复原 header/事件（含打包行）→ 持久化层 create+append 写入
 *     （本机压缩编码落盘）→ 附件按内容寻址写回；workspaceId 指定时把 cwd
 *     改写为目标工作区路径（跨机器导入的关键）。
 *
 * 本文件零运行时依赖（只 import node 内置），所有服务按名从 ctx 读取——
 * 插件装在 ~/.dsh/plugins 下，无法 import @deepseek-ai/* 包。
 * @module dsh-fork-to-workspace
 */

import { randomUUID } from 'node:crypto'
import { exportSession, importSession, MAX_IMPORT_BYTES, TransferError } from './transfer.js'

/** 本插件 Web API 的路由前缀（与客户端 bundle 的 fetch 路径对齐）。 */
const ROUTE_PREFIX = '/dsh-fork-ws'

/** 请求体读取上限（fork 请求体只含 sessionId/workspaceId/atSeq，1MiB 足够）。 */
const MAX_BODY_BYTES = 1024 * 1024

/** 携带业务错误码的错误（HTTP 400 时原样透传 code/message）。 */
class ForkApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ForkApiError'
    this.code = code
  }
}

/**
 * 插件入口：在 web 进程激活后注册路由。webServer 是 cordis registry 服务，
 * 用 ctx.inject 动态注入（TUI 等无 webServer 的 surface 上插件静默待机）。
 * @param ctx - 宿主 cordis 根上下文。
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    const handler = async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname
      try {
        if (req.method === 'GET' && path === `${ROUTE_PREFIX}/prepare`) {
          const sessionId = String(url.searchParams.get('sessionId') ?? '')
          sendJson(res, 200, await prepare(ctx, sessionId))
          return
        }
        if (req.method === 'POST' && path === `${ROUTE_PREFIX}/fork`) {
          const body = await readBody(req)
          sendJson(res, 200, await forkToWorkspace(ctx, body))
          return
        }
        if (req.method === 'GET' && path === `${ROUTE_PREFIX}/export`) {
          const sessionId = String(url.searchParams.get('sessionId') ?? '')
          await handleExport(ctx, res, sessionId)
          return
        }
        if (req.method === 'POST' && path === `${ROUTE_PREFIX}/import`) {
          const workspaceId = url.searchParams.get('workspaceId') ?? null
          const zip = await readBody(req, MAX_IMPORT_BYTES, true)
          sendJson(res, 200, await handleImport(ctx, zip, workspaceId))
          return
        }
        sendJson(res, 404, { ok: false, error: `no such route: ${req.method} ${path}` })
      } catch (error) {
        // 业务错误透传 code；未知错误一律归为 internal，避免泄漏内部细节。
        const code = error instanceof ForkApiError ? error.code : 'internal'
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          code,
        })
      }
    }
    return webCtx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
  })
}

// ---------------------------------------------------------------------------
// API 逻辑
// ---------------------------------------------------------------------------

/**
 * prepare：读取源会话（存在性 + 标题 + 所属工作区）与全部现有工作区。
 * @param ctx - 宿主上下文。
 * @param sessionId - 源会话 id。
 * @returns 对话框渲染所需的数据；会话不存在时返回 ok:false。
 */
async function prepare(ctx, sessionId) {
  if (!/^session-.+$/i.test(sessionId)) {
    return { ok: false, error: '无效的会话 id', code: 'invalid-session-id' }
  }
  let state
  try {
    state = await readSessionState(ctx, sessionId)
  } catch (error) {
    return { ok: false, error: error.message, code: error instanceof ForkApiError ? error.code : 'internal' }
  }
  const registry = ctx.get('workspaceRegistry')
  const workspaces = registry === undefined
    ? []
    : registry.list().map((workspace) => ({
        workspaceId: workspace.id,
        title: workspace.title,
        path: workspace.path,
      }))
  const sourceWorkspaceId = registry === undefined
    ? null
    : (registry.list().find(workspace => workspace.sessionIds.includes(sessionId))?.id ?? null)
  return {
    ok: true,
    source: {
      sessionId,
      // 标题从事件日志折叠（session/title 事件），与官方列表投影同源。
      title: foldSessionTitle(state.events) ?? null,
      workspaceId: sourceWorkspaceId,
    },
    workspaces,
  }
}

/**
 * forkToWorkspace：把源会话克隆进目标工作区（可选 atSeq 指定分支边界）。
 * @param ctx - 宿主上下文。
 * @param body - { sessionId, workspaceId?, atSeq? }。
 * @returns { ok: true, childId } 或 { ok: false, error, code }。
 */
async function forkToWorkspace(ctx, body) {
  const sessionId = String(body?.sessionId ?? '')
  if (!/^session-.+$/i.test(sessionId)) {
    return { ok: false, error: '无效的会话 id', code: 'invalid-session-id' }
  }
  // workspaceId 缺省 = 克隆到源会话自身的工作区（等价官方分叉）。
  const workspaceId = body?.workspaceId == null ? null : String(body.workspaceId)
  // atSeq：可选分支锚点（消息事件 seq；边界=第一个 seq>=atSeq 的已完成回合尾）。
  const atSeq = body?.atSeq == null ? undefined : Number(body.atSeq)
  if (atSeq !== undefined && (!Number.isSafeInteger(atSeq) || atSeq < 0)) {
    return { ok: false, error: '无效的分支位置', code: 'invalid-boundary' }
  }
  try {
    const registry = ctx.get('workspaceRegistry')
    if (registry === undefined) {
      return { ok: false, error: '工作区服务不可用', code: 'internal' }
    }
    // 解析目标工作区：
    // - 显式 workspaceId → 先解析（不存在优先报错，再读源会话）；
    // - 缺省 → 克隆到源会话自身工作区（等价官方分叉，此时必然"源在目标中"，
    //   跳过下面的归属防御）。
    let targetWorkspace
    if (workspaceId !== null) {
      targetWorkspace = registry.get(workspaceId)
      if (targetWorkspace === undefined) {
        return { ok: false, error: '目标工作区不存在', code: 'workspace-not-found' }
      }
    }
    const state = await readSessionState(ctx, sessionId)
    if (workspaceId === null) {
      targetWorkspace = sourceWorkspaceOf(registry, sessionId, state)
      if (targetWorkspace === undefined) {
        return { ok: false, error: '无法确定目标工作区', code: 'workspace-not-found' }
      }
    }
    // 防御：显式指定的目标工作区已包含源会话（客户端已排除，这里兜底）。
    if (workspaceId !== null && targetWorkspace.sessionIds.includes(sessionId)) {
      return { ok: false, error: '源会话已经属于目标工作区', code: 'source-in-target' }
    }
    const childId = await forkSession(ctx, state, targetWorkspace, atSeq)
    return { ok: true, childId }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: error instanceof ForkApiError ? error.code : 'internal',
    }
  }
}

/**
 * 源会话所属工作区（未分组时为 null；subagent 源不溯源，直接视为未分组）。
 * @param registry - workspaceRegistry 服务。
 * @param sessionId - 源会话 id。
 * @returns 工作区实体或 null。
 */
function sourceWorkspaceOf(registry, sessionId, state) {
  // 官方 forkWorkspace 对 subagent 会沿 parent 链找归属；这里保持简单：
  // 直接看 sessionIds 成员关系（普通会话的主路径；subagent 由浏览器端兜底）。
  return registry.list().find(workspace => workspace.sessionIds.includes(sessionId)) ?? null
}

/**
 * 核心克隆：读取源事件 → 计算边界 → 创建子 agent（seed + cwd=目标工作区）→
 * 挂载到目标工作区 → 标题自增。
 * @param ctx - 宿主上下文。
 * @param state - 已读取的源会话（header + events）。
 * @param targetWorkspace - 目标工作区实体（.path/.id）。
 * @param atSeq - 可选分支锚点。
 * @returns 子会话 id。
 */
async function forkSession(ctx, state, targetWorkspace, atSeq) {
  const events = state.events
  const lastSeq = events.at(-1)?.seq ?? -1
  // 边界逻辑逐行复刻官方 api-proxy fork：
  // - atSeq 提供时：第一个 seq >= atSeq 的 turn/end（锚点落在开放回合内则报错）；
  // - 缺省 / 锚点越界：最后一个 turn/end（无任何已完成回合则报错）。
  const anchoredBoundary = atSeq === undefined
    ? undefined
    : events.find(event => event.type === 'turn/end' && event.seq >= atSeq)
  const boundary = anchoredBoundary
    ?? (atSeq === undefined || atSeq > lastSeq
      ? events.findLast(event => event.type === 'turn/end')
      : undefined)
  if (boundary === undefined) {
    throw new ForkApiError(
      atSeq !== undefined && atSeq <= lastSeq
        ? `会话 "${state.id}" 尚未完成包含该位置的回合，无法在此处克隆`
        : `会话 "${state.id}" 没有可克隆的已完成回合`,
      'fork-unavailable',
    )
  }
  // 从边界后顺延穿过所有非 turn/start 的尾部事件（标题、注入等独立事件），
  // 保证种子是平衡的已完成回合前缀（与官方一致）。
  let cut = boundary.seq + 1
  while (cut < events.length && events[cut]?.type !== 'turn/start') cut += 1

  const agents = ctx.get('agents')
  if (agents === undefined) throw new ForkApiError('agents 服务不可用', 'internal')

  // preset：子会话继承源会话实际运行的 preset（事件里最新一次选择，其次 header）。
  const presetId = resolveSessionPreset(state.header, events)
  const presets = ctx.get('agentPresets')
  let setup
  if (presets !== undefined) {
    const resolved = await presets.resolve(presetId)
    setup = async (agentCtx) => { await presets.mount(agentCtx, resolved.id) }
  }

  // 模型参数：取源会话最后一个 request/header 的 config（与官方 log 优先一致）。
  const agentOptions = agentOptionsOf(events)

  const childId = `session-${randomUUID()}`
  try {
    await agents.create({
      sessionId: childId,
      // 种子 = 截至边界的完整事件前缀（官方 fork 同款）。
      seed: events.slice(0, cut),
      meta: {
        // ★ 跨工作区分叉的关键：cwd 直接设为目标工作区路径（canonical），
        // attachSession 会校验 header.cwd 与工作区 path 一致。
        cwd: targetWorkspace.path,
        // 分叉谱系：与官方 fork 一致，子会话记录父会话 id 与种子边界。
        parentSession: state.id,
        seedLength: cut,
        ...(presetId === undefined ? {} : { agentPreset: presetId }),
      },
      ...(agentOptions === undefined ? {} : { agentOptions }),
      ...(setup === undefined ? {} : { setup }),
    })
    // 挂到目标工作区：attachSession 内部会做 canonical-cwd 强校验并持久化
    // 成员关系；失败会抛错（此时子 agent 已 live，浏览器端会看到它出现在
    // 「未分组」下，与官方 fork 的 attach 失败语义一致）。
    await targetWorkspace.attachSession(childId)
  } catch (error) {
    if (error instanceof ForkApiError) throw error
    throw new ForkApiError(`克隆失败：${error instanceof Error ? error.message : String(error)}`, 'internal')
  }

  // 标题自增（与官方分叉的 increaseTitle 一致）：源标题 → 「原标题 (1)」。
  const titles = ctx.get('sessionTitle')
  const childAgent = agents.get(childId)
  const sourceTitle = foldSessionTitle(events)
  if (titles !== undefined && childAgent !== undefined && typeof sourceTitle === 'string' && sourceTitle !== '') {
    try {
      titles.rename(childAgent.session, increasedForkTitle(sourceTitle))
    } catch {
      // 标题自增失败不阻塞克隆（会话本身已创建成功）。
    }
  }
  return childId
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 读取一个会话的 header + 事件（live 优先，否则从 sessionPersistence 冷读）。
 * @param ctx - 宿主上下文。
 * @param sessionId - 会话 id。
 * @returns { id, header, events }。
 * @throws {ForkApiError} 会话不存在 / 持久化不可用。
 */
async function readSessionState(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  const attached = sessions?.get(sessionId)
  if (attached !== undefined) {
    return { id: attached.id, header: attached.header, events: [...attached.events] }
  }
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) {
    throw new ForkApiError('会话持久化服务不可用', 'internal')
  }
  const headers = await persistence.list()
  const meta = headers.find(candidate => candidate.id === sessionId)
  if (meta === undefined || meta.cwd === undefined) {
    throw new ForkApiError(`会话 "${sessionId}" 不存在`, 'session-not-found')
  }
  const inspected = await persistence.inspect(sessionId)
  if (inspected.meta.cwd === undefined) {
    throw new ForkApiError(`会话 "${sessionId}" 不存在`, 'session-not-found')
  }
  return { id: inspected.meta.id, header: inspected.meta, events: [...inspected.events] }
}

/**
 * 从事件日志折叠最新标题（session/title 事件，last-wins）——与官方
 * session-title 的 foldSessionTitle 同语义。
 * @param events - 会话事件数组。
 * @returns 标题；无标题事件时返回 undefined。
 */
function foldSessionTitle(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'session/title'
      && typeof event.data?.title === 'string'
      && event.data.title !== '') {
      return event.data.title
    }
  }
  return undefined
}

/**
 * 解析会话实际运行的 agent preset：事件里最新一次 agent-preset/selected 优先，
 * 其次 header.agentPreset（与官方 dsh-agent-presets 的 resolveSessionPreset 同款）。
 * @param header - 会话 header。
 * @param events - 会话事件。
 * @returns preset id；无 preset 时返回 undefined。
 */
function resolveSessionPreset(header, events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'agent-preset/selected') return event.data.agentPreset
  }
  return header.agentPreset
}

/**
 * 取源会话最后一个 request/header 的模型配置，作为子会话的 agentOptions。
 * 官方 selectionFor 优先读 log 的 request header，这里对齐。
 * @param events - 会话事件。
 * @returns { provider, model, reasoningEffort? }；无记录时返回 undefined。
 */
function agentOptionsOf(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'request/header') continue
    const config = event.data?.header?.config
    if (config !== undefined
      && typeof config.provider === 'string'
      && typeof config.model === 'string') {
      return {
        provider: config.provider,
        model: config.model,
        ...(typeof config.reasoningEffort === 'string'
          ? { reasoningEffort: config.reasoningEffort }
          : {}),
      }
    }
  }
  return undefined
}

/**
 * 标题自增：尾部是半角/全角括号数字时 +1，否则追加 " (1)"。
 * （与官方客户端 sessions/service.ts 的 increasedForkTitle 一致。）
 * @param title - 源标题。
 * @returns 自增后的标题。
 */
function increasedForkTitle(title) {
  const ascii = /^(.*?)\((\d+)\)$/u.exec(title)
  if (ascii?.[1] !== undefined && ascii[2] !== undefined) {
    return `${ascii[1]}(${BigInt(ascii[2]) + 1n})`
  }
  const fullWidth = /^(.*?)（(\d+)）$/u.exec(title)
  if (fullWidth?.[1] !== undefined && fullWidth[2] !== undefined) {
    return `${fullWidth[1]}（${BigInt(fullWidth[2]) + 1n}）`
  }
  return `${title} (1)`
}

/**
 * 读取请求体（带大小上限，超限报错）。
 * @param req - IncomingMessage。
 * @param maxBytes - 大小上限（默认 fork 用 1MiB；import 传 MAX_IMPORT_BYTES）。
 * @param binary - 是否返回原始 Buffer（import 的 zip 字节）；false 解析 JSON。
 * @returns 解析后的对象（binary=false，空 body 返回 {}）或 Buffer（binary=true）。
 */
function readBody(req, maxBytes = MAX_BODY_BYTES, binary = false) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) {
        reject(new ForkApiError('请求体过大', 'payload-too-large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks)
      if (binary) {
        resolve(raw)
        return
      }
      const text = raw.toString('utf8')
      if (text.trim() === '') {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new ForkApiError('请求体不是合法 JSON', 'bad-json'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * 导出会话 zip 下载。
 * @param ctx - 宿主上下文。
 * @param res - ServerResponse。
 * @param sessionId - 源会话 id。
 */
async function handleExport(ctx, res, sessionId) {
  if (!/^session-.+$/i.test(sessionId)) {
    sendJson(res, 400, { ok: false, error: '无效的会话 id', code: 'invalid-session-id' })
    return
  }
  try {
    const { filename, zip, attachmentCount } = await exportSession(ctx, sessionId)
    res.writeHead(200, {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': zip.length,
    })
    res.end(zip)
  } catch (error) {
    const code = error instanceof TransferError ? error.code : 'internal'
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code,
    })
  }
}

/**
 * 导入会话 zip。
 * @param ctx - 宿主上下文。
 * @param zip - zip 字节。
 * @param workspaceId - 目标工作区 id（可空：保留原 cwd）。
 * @returns 导入结果。
 */
async function handleImport(ctx, zip, workspaceId) {
  try {
    // 目标工作区解析（可空：保留 zip 内原始 cwd）。
    let targetWorkspace
    if (workspaceId !== null && workspaceId !== '') {
      const registry = ctx.get('workspaceRegistry')
      targetWorkspace = registry?.get(workspaceId)
      if (targetWorkspace === undefined) {
        return { ok: false, error: '目标工作区不存在', code: 'workspace-not-found' }
      }
    }
    const result = await importSession(ctx, zip, targetWorkspace)
    return { ok: true, ...result }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code: error instanceof TransferError ? error.code : 'internal',
    }
  }
}

/**
 * 输出 JSON 响应（统一 UTF-8 + content-type）。
 * @param res - ServerResponse。
 * @param status - HTTP 状态码。
 * @param body - 序列化对象。
 */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}
