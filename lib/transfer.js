/**
 * dsh-fork-to-workspace — 会话导出 / 导入（宿主端转移模块）。
 *
 * 官方只有导出 RPC（downloads.sessionLog）且没有任何界面入口，没有导入。
 * 本模块用**零依赖**方式实现完整闭环：
 *
 * - 导出：把会话的原始日志文本（readRaw 解码文本，与官方 zip 首条目一致）
 *   与全部图片附件（attachments 服务按引用读取）打包成 zip
 *   （dsh-session-<id>.zip，条目 `session.jsonl` + `media/<attachmentId>.<ext>`，
 *   与官方导出格式兼容）。
 * - 导入：解析 zip → 复原 header 与事件（含 text-chunks 等打包行展开，复刻
 *   官方 decodeStorageRecord）→ 通过持久化层公开接口 create + append 写入
 *   （后端自动按本机压缩配置落盘，不依赖源机器的 zstd 编码）→ 附件按内容
 *   寻址写回 attachments/v1/objects/。导入时可选目标工作区，把 header.cwd
 *   改写为本机路径，会话直接归属到该工作区。
 *
 * zip 打包/解析为手写实现（CRC32 + deflateRaw / inflateRaw，node:zlib），
 * 不引入任何依赖；条目名做白名单校验防路径穿越。
 * @module dsh-fork-to-workspace/transfer
 */

import { createHash, randomUUID } from 'node:crypto'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

/** 导入时单批 append 的事件数（控制内存与写入批次）。 */
const APPEND_BATCH = 500
/** 导入请求体大小上限（zip 含附件，放宽到 200MiB）。 */
export const MAX_IMPORT_BYTES = 200 * 1024 * 1024

/** 业务错误（带 code）。 */
export class TransferError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'TransferError'
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// zip 打包 / 解析（零依赖）
// ---------------------------------------------------------------------------

/** CRC32 查表法。 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  return table
})()

/** 计算 Buffer 的 CRC32。 */
function crc32(buffer) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** 小端写 16/32 位整数。 */
function writeU16(value, out, at) {
  out[at] = value & 0xFF
  out[at + 1] = (value >>> 8) & 0xFF
}
function writeU32(value, out, at) {
  out[at] = value & 0xFF
  out[at + 1] = (value >>> 8) & 0xFF
  out[at + 2] = (value >>> 16) & 0xFF
  out[at + 3] = (value >>> 24) & 0xFF
}

/**
 * 把条目打包成标准 zip（DEFLATE 压缩）。
 * @param entries - [{ name, data: Buffer }]。
 * @returns zip 字节。
 */
export function buildZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8')
    const compressed = deflateRawSync(entry.data)
    const crc = crc32(entry.data)
    const header = Buffer.alloc(30)
    writeU32(0x04034B50, header, 0) // local file header signature
    writeU16(20, header, 4) // version needed
    writeU16(0x0800, header, 6) // flags: UTF-8 names
    writeU16(8, header, 8) // method: deflate
    writeU32(0, header, 10) // mod time/date
    writeU32(crc, header, 14)
    writeU32(compressed.length, header, 18)
    writeU32(entry.data.length, header, 22)
    writeU16(nameBytes.length, header, 26)
    writeU16(0, header, 28) // extra length
    localParts.push(header, nameBytes, compressed)

    const central = Buffer.alloc(46)
    writeU32(0x02014B50, central, 0) // central directory signature
    writeU16(20, central, 4) // version made by
    writeU16(20, central, 6) // version needed
    writeU16(0x0800, central, 8)
    writeU16(8, central, 10)
    writeU32(0, central, 12)
    writeU32(crc, central, 16)
    writeU32(compressed.length, central, 20)
    writeU32(entry.data.length, central, 24)
    writeU16(nameBytes.length, central, 28)
    writeU16(0, central, 30)
    writeU16(0, central, 32)
    writeU16(0, central, 34)
    writeU16(0, central, 36)
    writeU32(0, central, 38) // external attrs
    writeU32(offset, central, 42)
    centralParts.push(central, nameBytes)

    offset += header.length + nameBytes.length + compressed.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const eocd = Buffer.alloc(22)
  writeU32(0x06054B50, eocd, 0) // end of central directory signature
  writeU16(0, eocd, 4)
  writeU16(0, eocd, 6)
  writeU16(entries.length, eocd, 8)
  writeU16(entries.length, eocd, 10)
  writeU32(centralSize, eocd, 12)
  writeU32(offset, eocd, 16)
  writeU16(0, eocd, 20)

  return Buffer.concat([...localParts, ...centralParts, eocd])
}

/**
 * 解析 zip 字节，返回 [{ name, data }]。
 * 只支持标准 zip（method 0 store / 8 deflate），读取 EOCD → central directory。
 * @param buffer - zip 字节。
 * @returns 条目列表。
 */
export function parseZip(buffer) {
  if (buffer.length < 22) throw new TransferError('zip 文件不完整', 'bad-zip')
  // 从尾部找 EOCD（0x06054B50）。
  let eocdAt = -1
  const tailStart = Math.max(0, buffer.length - 22 - 65535)
  for (let i = buffer.length - 22; i >= tailStart; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054B50) { eocdAt = i; break }
  }
  if (eocdAt === -1) throw new TransferError('zip 文件缺少中央目录', 'bad-zip')
  const entryCount = buffer.readUInt16LE(eocdAt + 10)
  const centralAt = buffer.readUInt32LE(eocdAt + 16)
  const entries = []
  let cursor = centralAt
  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014B50) {
      throw new TransferError('zip 中央目录损坏', 'bad-zip')
    }
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localAt = buffer.readUInt32LE(cursor + 42)
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)
    cursor += 46 + nameLength + extraLength + commentLength

    // 读 local header 得到数据偏移。
    if (buffer.readUInt32LE(localAt) !== 0x04034B50) {
      throw new TransferError(`zip 条目 "${name}" 的本地头损坏`, 'bad-zip')
    }
    const localNameLength = buffer.readUInt16LE(localAt + 26)
    const localExtraLength = buffer.readUInt16LE(localAt + 28)
    const dataAt = localAt + 30 + localNameLength + localExtraLength
    const raw = buffer.subarray(dataAt, dataAt + compressedSize)
    let data
    if (method === 0) data = Buffer.from(raw)
    else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: uncompressedSize || undefined })
    else throw new TransferError(`zip 条目 "${name}" 使用了不支持的压缩方式 ${method}`, 'bad-zip')
    entries.push({ name, data })
  }
  return entries
}

// ---------------------------------------------------------------------------
// 附件引用收集（复刻官方 session-export 的扫描规则）
// ---------------------------------------------------------------------------

/** 收集一段 content 数组内的图片引用（含嵌套 tool result）。 */
function collectImageRefs(content, refs) {
  if (!Array.isArray(content)) return
  const pending = []
  for (const item of content) pending.push(item)
  while (pending.length > 0) {
    const value = pending.pop()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const block = value
    if (block.type === 'image' && typeof block.attachment === 'object' && block.attachment !== null) {
      refs.set(String(block.attachment.attachmentId), block.attachment)
    }
    if (Array.isArray(block.content)) {
      for (const item of block.content) pending.push(item)
    }
  }
}

/** 收集一个事件内的图片引用（直接 content / message / inserted / block-end）。 */
function collectEventImageRefs(event, refs) {
  const data = event?.data
  if (typeof data !== 'object' || data === null) return
  collectImageRefs(data.content, refs)
  if (typeof data.message === 'object' && data.message !== null) {
    collectImageRefs(data.message.content, refs)
  }
  if (Array.isArray(data.inserted)) {
    for (const message of data.inserted) collectImageRefs(message?.content, refs)
  }
  if (data.chunk?.type === 'block-end') collectImageRefs([data.chunk.block], refs)
}

/** 从日志文本中收集全部去重图片引用。 */
function imageRefsInArtifact(content) {
  const refs = new Map()
  for (const line of content.split('\n')) {
    if (line === '') continue
    let event
    try { event = JSON.parse(line) } catch { continue }
    collectEventImageRefs(event, refs)
  }
  return refs
}

// ---------------------------------------------------------------------------
// 存储行解码（复刻官方 decodeStorageRecord：text-chunks 等打包行展开）
// ---------------------------------------------------------------------------

/**
 * 解码一条存储行：普通事件原样返回；chunk 打包行展开为原始 delta 事件。
 * @param value - 一行 JSON.parse 的结果。
 * @returns 事件数组。
 */
function decodeStorageRecord(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [value]
  const tag = value.type
  if (tag !== 'text-chunks' && tag !== 'reasoning-chunks' && tag !== 'tool-call-chunks') {
    return [value]
  }
  const data = value.data
  if (typeof data !== 'object' || data === null) throw malformed(tag, 'data 必须是对象')
  if (!Number.isSafeInteger(value.seq0) || value.seq0 < 0) throw malformed(tag, 'seq0 非法')
  if (!Number.isSafeInteger(value.time0)) throw malformed(tag, 'time0 非法')
  if (typeof data.turn !== 'number' || typeof data.step !== 'number' || typeof data.index !== 'number') {
    throw malformed(tag, 'turn/step/index 必须是数字')
  }
  const payloadKey = tag === 'tool-call-chunks' ? 'args' : 'texts'
  const payload = data[payloadKey]
  if (!Array.isArray(payload) || payload.length === 0 || payload.some(entry => typeof entry !== 'string')) {
    throw malformed(tag, `${payloadKey} 必须是字符串数组`)
  }
  const dt = data.dt
  if (!Array.isArray(dt) || dt.some(gap => !Number.isSafeInteger(gap)) || dt.length !== payload.length - 1) {
    throw malformed(tag, 'dt 非法')
  }
  const events = []
  let time = value.time0
  for (let k = 0; k < payload.length; k += 1) {
    if (k > 0) time += dt[k - 1]
    let chunk
    if (tag === 'text-chunks') chunk = { type: 'text-delta', index: data.index, text: payload[k] }
    else if (tag === 'reasoning-chunks') chunk = { type: 'reasoning-delta', index: data.index, text: payload[k] }
    else {
      chunk = {
        type: 'tool-call-delta',
        index: data.index,
        id: data.id,
        ...(data.name === undefined ? {} : { name: data.name }),
        argumentsDelta: payload[k],
      }
    }
    events.push({ type: 'assistant/chunk', seq: value.seq0 + k, time, data: { turn: data.turn, step: data.step, chunk } })
  }
  return events
}

/** 打包行损坏的统一报错。 */
function malformed(tag, why) {
  return new TransferError(`malformed ${tag} storage row: ${why}`, 'bad-log')
}

/**
 * 解析导出的会话日志文本：第一行 header（type:'session'），其余为事件行。
 * @param content - 日志文本。
 * @returns { header, events }。
 */
export function parseSessionLogText(content) {
  const lines = content.split('\n')
  let header
  const events = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line === '') continue
    let value
    try { value = JSON.parse(line) } catch (error) {
      throw new TransferError(`第 ${i + 1} 行不是合法 JSON：${error.message}`, 'bad-log')
    }
    if (header === undefined) {
      if (value?.type !== 'session') throw new TransferError('日志首行不是会话头', 'bad-log')
      header = value
      continue
    }
    for (const event of decodeStorageRecord(value)) events.push(event)
  }
  if (header === undefined) throw new TransferError('日志缺少会话头', 'bad-log')
  return { header, events }
}

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

/**
 * 导出会话为 zip 字节。
 * @param ctx - 宿主上下文。
 * @param sessionId - 源会话 id。
 * @returns { filename, zip }。
 */
export async function exportSession(ctx, sessionId) {
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined || !persistence.supportsRawArtifacts) {
    throw new TransferError('会话持久化后端不支持导出', 'internal')
  }
  // live 会话先 flush，保证 readRaw 读到最新落盘内容（官方同款）。
  const sessions = ctx.get('sessions')
  const live = sessions?.get(sessionId)
  if (live !== undefined && typeof sessions.flush === 'function') {
    await sessions.flush(live)
  }
  const artifact = await persistence.readRaw(sessionId)
  if (artifact === undefined) {
    throw new TransferError(`会话 "${sessionId}" 不存在或没有落盘日志`, 'session-not-found')
  }
  const entries = [{ name: 'session.jsonl', data: Buffer.from(artifact.content, 'utf8') }]

  // 附件：按日志引用的 attachmentId 去重读取。
  const attachments = ctx.get('attachments')
  let attachmentCount = 0
  if (attachments !== undefined) {
    for (const ref of imageRefsInArtifact(artifact.content).values()) {
      try {
        const stored = await attachments.readImage(ref)
        const extension = mediaExtension(ref.mediaType)
        entries.push({
          name: `media/${String(ref.attachmentId)}.${extension}`,
          data: Buffer.from(stored.data),
        })
        attachmentCount += 1
      } catch {
        // 单个附件缺失不阻塞导出（日志本身完整）。
      }
    }
  }
  const safeId = sessionId.replace(/[^A-Za-z0-9_-]/g, '_')
  return { filename: `dsh-session-${safeId}.zip`, zip: buildZip(entries), attachmentCount }
}

/** 媒体类型 → 扩展名。 */
function mediaExtension(mediaType) {
  switch (mediaType) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    default: return 'bin'
  }
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

/** 附件本地根目录（与 attachment-local 同规则：<dshHome>/attachments/v1）。 */
function attachmentsRoot() {
  const home = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== ''
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  return join(home, 'attachments', 'v1')
}

/**
 * 导入会话 zip。
 * @param ctx - 宿主上下文。
 * @param zip - zip 字节。
 * @param targetWorkspace - 目标工作区实体（可空：保留原 cwd）。
 * @returns { sessionId, eventsImported, attachmentsImported, warnings, title? }。
 */
export async function importSession(ctx, zip, targetWorkspace) {
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) {
    throw new TransferError('会话持久化服务不可用', 'internal')
  }
  let entries
  try {
    entries = parseZip(zip)
  } catch (error) {
    if (error instanceof TransferError) throw error
    throw new TransferError(`zip 解析失败：${error.message}`, 'bad-zip')
  }

  // 1) 取会话日志条目。
  const logEntry = entries.find(entry => entry.name === 'session.jsonl')
  if (logEntry === undefined) {
    throw new TransferError('zip 里没有 session.jsonl（不是本插件/官方导出的会话包）', 'bad-zip')
  }
  const { header, events } = parseSessionLogText(logEntry.data.toString('utf8'))
  const sessionId = String(header.id ?? '')
  if (!/^session-.+$/i.test(sessionId)) {
    throw new TransferError('会话头里的 id 非法', 'bad-zip')
  }

  // 2) 已存在检查。
  const existing = await persistence.list()
  if (existing.some(candidate => candidate.id === sessionId)) {
    throw new TransferError(`会话 "${sessionId}" 已存在，请先删除或改名再导入`, 'duplicate-session')
  }

  // 3) 构造本机 header：cwd 改写为目标工作区路径（跨机器关键步骤）。
  const meta = { ...header, cwd: targetWorkspace === undefined ? header.cwd : targetWorkspace.path }
  await persistence.create(meta)

  // 4) 分批 append 事件。
  const warnings = []
  for (let at = 0; at < events.length; at += APPEND_BATCH) {
    try {
      await persistence.append(sessionId, events.slice(at, at + APPEND_BATCH))
    } catch (error) {
      // 部分写入失败：删除已建会话文件，避免残留半成品。
      warnings.push(`事件写入失败：${error instanceof Error ? error.message : String(error)}`)
      break
    }
  }

  // 5) 附件：media/<attachmentId>.<ext> → attachments/v1/objects/<2>/<hash>。
  let attachmentsImported = 0
  const root = attachmentsRoot()
  for (const entry of entries) {
    if (!entry.name.startsWith('media/')) continue
    const base = entry.name.slice('media/'.length)
    const dot = base.lastIndexOf('.')
    const idPart = dot === -1 ? base : base.slice(0, dot)
    // 官方条目名是 sha256:<64hex>；兼容纯 64hex。
    const match = /^sha256:([a-f0-9]{64})$/.exec(idPart) ?? /^([a-f0-9]{64})$/.exec(idPart)
    if (match === null) {
      warnings.push(`跳过未知附件条目 "${entry.name}"`)
      continue
    }
    const hash = match[1]
    const target = join(root, 'objects', hash.slice(0, 2), hash)
    try {
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, entry.data)
      attachmentsImported += 1
    } catch (error) {
      warnings.push(`附件 "${entry.name}" 写入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { sessionId, eventsImported: events.length, attachmentsImported, warnings }
}

/** 供测试/调试使用的导出工具引用。 */
export const __internals = { crc32, mediaExtension }
