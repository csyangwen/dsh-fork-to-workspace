/**
 * dsh-fork-to-workspace — 导出/导入模块冒烟测试。
 *
 * 覆盖：zip 打包/解析往返、chunk 打包行展开、导出（flush + readRaw +
 * 附件收集）、导入（持久化 create+append、cwd 改写、附件写回、重复 id
 * 拒绝、坏 zip / 路径穿越防御）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildZip, parseZip, parseSessionLogText, exportSession, importSession, __internals } from '../lib/transfer.js'

/** 构造一段含普通事件与打包行（text-chunks）的日志文本。 */
function sampleLogText(id = 'session-export-me') {
  const header = {
    type: 'session', version: 0, id, createdAt: 1723000000000, cwd: '/src/project-a',
    delegationDepth: 0, agentPreset: 'anchored-standard',
  }
  const events = [
    { seq: 0, type: 'turn/start', time: 1723000000100, data: { turn: 1 } },
    { seq: 1, type: 'user/message', time: 1723000000200, data: { content: [{ type: 'text', text: 'hi' }] } },
    { seq: 2, type: 'request/header', time: 1723000000300, data: { header: { config: { provider: 'p', model: 'm' } }, reason: 'initial' } },
    { seq: 3, type: 'turn/end', time: 1723000000400, data: { turn: 1 } },
  ]
  // 打包行：3 个连续 text-delta（dt 相邻 +1ms）。
  const packed = {
    type: 'text-chunks', seq0: 4, time0: 1723000000500,
    data: { turn: 2, step: 1, index: 0, dt: [1, 1], texts: ['a', 'b', 'c'] },
  }
  return [header, ...events, packed].map(entry => JSON.stringify(entry)).join('\n') + '\n'
}

/** 最小 fake ctx（持久化 + 附件 + sessions）。 */
function makeCtx({ attachDir } = {}) {
  const stored = new Map() // id → { header, events }
  const created = []
  const attachments = new Map()
  const ctx = {
    _stored: stored,
    _created: created,
    _attachments: attachments,
    get(name) {
      switch (name) {
        case 'sessionPersistence': return {
          supportsRawArtifacts: true,
          async list() { return [...stored.values()].map(entry => entry.header) },
          async readRaw(id) {
            const entry = stored.get(id)
            if (entry === undefined) return undefined
            const lines = [JSON.stringify({ type: 'session', ...entry.header })]
            for (const event of entry.events) lines.push(JSON.stringify(event))
            return { meta: entry.header, filename: 'session', content: lines.join('\n') + '\n' }
          },
          async create(meta) {
            created.push(meta)
            stored.set(meta.id, { header: meta, events: [] })
          },
          async append(id, events) {
            const entry = stored.get(id)
            if (entry === undefined) throw new Error(`no session ${id}`)
            entry.events.push(...events)
          },
        }
        case 'attachments': return {
          async readImage(ref) {
            const data = attachments.get(String(ref.attachmentId))
            if (data === undefined) throw new Error('missing attachment')
            return { ref, data }
          },
        }
        case 'sessions': return {
          get() { return undefined },
        }
        default: return undefined
      }
    },
  }
  return ctx
}

/** 真实文件系统附件根（测试用临时目录）。 */
function makeFsCtx() {
  const dir = mkdtempSync(join(tmpdir(), 'fw-transfer-'))
  const stored = new Map()
  return {
    dir,
    ctx: {
      get(name) {
        switch (name) {
          case 'sessionPersistence': return {
            supportsRawArtifacts: true,
            async list() { return [...stored.values()].map(entry => entry.header) },
            async readRaw(id) {
              const entry = stored.get(id)
              if (entry === undefined) return undefined
              const lines = [JSON.stringify({ type: 'session', ...entry.header })]
              for (const event of entry.events) lines.push(JSON.stringify(event))
              return { meta: entry.header, filename: 'session', content: lines.join('\n') + '\n' }
            },
            async create(meta) { stored.set(meta.id, { header: meta, events: [] }) },
            async append(id, events) { stored.get(id).events.push(...events) },
          }
          default: return undefined
        }
      },
    },
    stored,
  }
}

test('zip 打包/解析往返', () => {
  const entries = [
    { name: 'session.jsonl', data: Buffer.from('hello\nworld') },
    { name: 'media/sha256:abcd'.padEnd(73, 'e') + '.png', data: Buffer.from([0x89, 0x50, 0x4E, 0x47]) },
    { name: '大文件.txt', data: Buffer.from('x'.repeat(100000)) },
  ]
  const zip = buildZip(entries)
  const parsed = parseZip(zip)
  assert.equal(parsed.length, 3)
  assert.equal(parsed[0].name, 'session.jsonl')
  assert.equal(parsed[0].data.toString('utf8'), 'hello\nworld')
  assert.deepEqual([...parsed[2].data], [...entries[2].data])
})

test('parseSessionLogText：header + 普通事件 + 打包行展开', () => {
  const { header, events } = parseSessionLogText(sampleLogText())
  assert.equal(header.id, 'session-export-me')
  assert.equal(header.agentPreset, 'anchored-standard')
  assert.equal(events.length, 7) // 4 普通 + 3 展开
  const expanded = events.slice(4)
  assert.deepEqual(expanded.map(e => e.type), ['assistant/chunk', 'assistant/chunk', 'assistant/chunk'])
  assert.equal(expanded[0].seq, 4)
  assert.equal(expanded[2].seq, 6)
  assert.equal(expanded[2].data.chunk.text, 'c')
  assert.equal(expanded[1].time, 1723000000501) // time0 + dt[0]（dt 为相邻增量）
})

test('导出：flush + readRaw + 附件收集打包', async () => {
  const ctx = makeCtx()
  // 预置一个带图片引用的会话。
  const id = 'session-with-img'
  const event = {
    seq: 0, type: 'user/message', time: 1,
    data: { content: [{ type: 'image', attachment: { attachmentId: 'sha256:' + 'a'.repeat(64), mediaType: 'image/png', bytes: 4, width: 1, height: 1 } }] },
  }
  ctx._stored.set(id, {
    header: { id, version: 0, createdAt: 1, cwd: '/src/p', delegationDepth: 0 },
    events: [event],
  })
  ctx._attachments.set('sha256:' + 'a'.repeat(64), Uint8Array.from([1, 2, 3, 4]))
  const { filename, zip, attachmentCount } = await exportSession(ctx, id)
  assert.equal(filename, 'dsh-session-session-with-img.zip') // 与官方一致：dsh-session-<id>.zip，id 自带 session- 前缀
  assert.equal(attachmentCount, 1)
  const parsed = parseZip(zip)
  assert.equal(parsed[0].name, 'session.jsonl')
  assert.ok(parsed.some(e => e.name === `media/sha256:${'a'.repeat(64)}.png`))
})

test('导入：写入持久化 + cwd 改写为目标工作区', async () => {
  const ctx = makeCtx()
  const zip = buildZip([{ name: 'session.jsonl', data: Buffer.from(sampleLogText('session-in-1'), 'utf8') }])
  const target = { id: 'ws-t', title: '项目B', path: '/target/project-b' }
  const result = await importSession(ctx, zip, target)
  assert.equal(result.sessionId, 'session-in-1')
  assert.equal(result.eventsImported, 7)
  const entry = ctx._stored.get('session-in-1')
  assert.equal(entry.header.cwd, '/target/project-b')
  assert.equal(entry.header.agentPreset, 'anchored-standard')
  assert.equal(entry.events.length, 7)
  assert.equal(entry.events[0].seq, 0)
  assert.equal(entry.events[6].seq, 6)
  assert.deepEqual(ctx._created.map(c => c.id), ['session-in-1'])
})

test('导入：指定目标工作区时调用 attachSession 登记成员', async () => {
  const ctx = makeCtx()
  const attached = []
  const target = {
    id: 'ws-t', title: '项目B', path: '/target/project-b',
    attachSession(id) { attached.push(id) },
  }
  const zip = buildZip([{ name: 'session.jsonl', data: Buffer.from(sampleLogText('session-in-4'), 'utf8') }])
  const result = await importSession(ctx, zip, target)
  assert.deepEqual(attached, [result.sessionId])
})

test('导入：保留原 cwd（无目标工作区）', async () => {
  const ctx = makeCtx()
  const zip = buildZip([{ name: 'session.jsonl', data: Buffer.from(sampleLogText('session-in-2'), 'utf8') }])
  const result = await importSession(ctx, zip, undefined)
  assert.equal(ctx._stored.get('session-in-2').header.cwd, '/src/project-a')
  assert.equal(result.attachmentsImported, 0)
})

test('导入：附件写回 attachments/v1/objects/<2>/<hash>', async () => {
  const fs = makeFsCtx()
  const id = 'session-in-3'
  const hash = 'b'.repeat(64)
  const event = {
    seq: 0, type: 'user/message', time: 1,
    data: { content: [{ type: 'image', attachment: { attachmentId: `sha256:${hash}`, mediaType: 'image/png', bytes: 4, width: 1, height: 1 } }] },
  }
  const zip = buildZip([
    { name: 'session.jsonl', data: Buffer.from(sampleLogText(id), 'utf8') },
    { name: `media/sha256:${hash}.png`, data: Buffer.from([9, 8, 7]) },
  ])
  const oldRoot = process.env.DSH_HOME
  process.env.DSH_HOME = fs.dir
  try {
    const result = await importSession(fs.ctx, zip, undefined)
    assert.equal(result.attachmentsImported, 1)
    const target = join(fs.dir, 'attachments', 'v1', 'objects', hash.slice(0, 2), hash)
    assert.ok(existsSync(target))
    assert.deepEqual([...readFileSync(target)], [9, 8, 7])
  } finally {
    if (oldRoot === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = oldRoot
  }
})

test('导入：重复 id 自动复制为新 id（不覆盖原会话）', async () => {
  const ctx = makeCtx()
  const zip = buildZip([{ name: 'session.jsonl', data: Buffer.from(sampleLogText('session-dup'), 'utf8') }])
  const first = await importSession(ctx, zip, undefined)
  assert.equal(first.sessionId, 'session-dup')
  assert.equal(first.copiedFrom, undefined)
  const second = await importSession(ctx, zip, undefined)
  assert.notEqual(second.sessionId, 'session-dup')
  assert.equal(second.copiedFrom, 'session-dup')
  assert.match(second.sessionId, /^session-/)
  // 原会话不被覆盖，副本事件完整。
  assert.equal(ctx._stored.get('session-dup').events.length, 7)
  assert.equal(ctx._stored.get(second.sessionId).events.length, 7)
})

test('导入：坏 zip / 缺 session.jsonl / 路径穿越防御', async () => {
  const ctx = makeCtx()
  await assert.rejects(() => importSession(ctx, Buffer.from('not a zip'), undefined), /zip/)
  const noLog = buildZip([{ name: 'other.txt', data: Buffer.from('x') }])
  await assert.rejects(() => importSession(ctx, noLog, undefined), /session\.jsonl/)
  const evil = buildZip([{ name: '../../etc/passwd', data: Buffer.from('evil') }])
  await assert.rejects(() => importSession(ctx, evil, undefined), /session\.jsonl/)
})

test('导出缺会话：session-not-found', async () => {
  const ctx = makeCtx()
  await assert.rejects(() => exportSession(ctx, 'session-missing'), /不存在/)
})

test('crc32 与已知值一致', () => {
  assert.equal(__internals.crc32(Buffer.from('123456789')), 0xCBF43926)
})
