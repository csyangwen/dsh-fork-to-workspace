/**
 * dsh-fork-to-workspace — 客户端入口。
 *
 * 纯 DOM 增强（不改 DSH 框架源码），三个注入点：
 *
 * 1. **侧边栏会话行三点菜单**：在官方「分叉会话」行后追加
 *    「分叉会话到其他工作区…」入口 → 打开工作区选择对话框 →
 *    把源会话（截至最后一个已完成回合）克隆进目标工作区。
 *    源会话 id 由「最近一次点击的三点按钮所在会话行」解析（菜单是 portal
 *    渲染到 body 的，DOM 不带会话 id，只能从行内 aria-label 的标题反查
 *    客户端 sessions 列表，辅以所属工作区消歧）。
 *
 * 2. **会话内分支按钮（官方「在新对话中分支」）接管**：点击任意已完成轮次的
 *    分支按钮不再直接分叉，而是弹出二选一：
 *    - 克隆到当前工作区 —— 走官方客户端 fork 通道（同工作区，标题自增）；
 *    - 克隆到其他工作区… —— 打开工作区选择对话框（带该轮 atSeq 锚点）。
 *    中间轮（官方 aria-disabled）一并启用（Memory Evolve 同款做法），实现
 *    「克隆任意分支」。
 *
 * 3. 对话框 / 弹层用 react-dom createRoot 挂到 document.body，关闭即卸载。
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Context } from 'cordis'
// Type-only：把 sessions/workspaces 服务合入 cordis Context 类型。
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import styles from './styles.css'
import { t } from './texts.ts'
import { BranchMenu } from './BranchMenu.tsx'
import { ForkDialog } from './ForkDialog.tsx'

/** 本插件需要的客户端服务。 */
export const inject = ['sessions', 'workspaces']

// ---------------------------------------------------------------------------
// 常量与匹配规则
// ---------------------------------------------------------------------------

/** 官方分支按钮文案（zh/en；title/aria-label 均可能携带）。 */
const BRANCH_PATTERNS = ['在新对话中分支', 'Branch into a new conversation']

/** 侧边栏会话行菜单里的「分叉会话」行文案（zh/en；精确匹配，避免匹配到我们自己注入的行）。 */
const FORK_ITEM_PATTERNS = ['分叉会话', 'Fork session']

/** 会话行三点按钮 aria-label 前缀（zh/en；工作区行是「工作区“…”，不命中）。 */
const SESSION_ARIA_PREFIXES = ['会话“', 'Session actions for ']

/** 已注入「分叉会话到其他工作区…」的菜单标记（幂等，React 重开菜单后标记随旧节点销毁）。 */
const MENU_INJECTED_ATTR = 'data-fw-menu-injected'

/** 已启用（原官方禁用）的分支按钮标记：用于隐藏官方 tooltip 提示。 */
const BRANCH_ENABLED_ATTR = 'data-fw-branch-enabled'

/** 注入菜单项用的分支图标 SVG（与官方 IconBranchOutline16 同 path）。 */
const BRANCH_ICON_SVG = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + '<path fillRule="evenodd" clipRule="evenodd" d="M13.0762 1.37207C14.0846 1.37228 14.9021 2.19077 14.9023 3.19922C14.9022 4.20772 14.0847 5.02518 13.0762 5.02539C12.2967 5.02539 11.6325 4.53691 11.3701 3.84961H4.35547C4.79397 4.26458 5.15861 4.7644 5.41699 5.33496L7.10645 9.06738C7.88526 10.7875 9.55104 11.9228 11.4189 12.0371C11.7085 11.4109 12.3411 10.9756 13.0762 10.9756C14.0843 10.9759 14.9023 11.7936 14.9023 12.8018C14.9023 13.81 14.0843 14.6277 13.0762 14.6279C12.2534 14.6279 11.5574 14.0832 11.3291 13.335C8.9868 13.1879 6.89981 11.7612 5.92285 9.60352L4.23242 5.87109C3.67503 4.64033 2.44878 3.84961 1.09766 3.84961V2.54883C1.10665 2.54883 1.11601 2.54975 1.125 2.5498L11.3701 2.54883C11.6326 1.86151 12.2969 1.37207 13.0762 1.37207ZM13.0762 12.2764C12.7858 12.2764 12.5508 12.5114 12.5508 12.8018C12.5508 13.0921 12.7858 13.3281 13.0762 13.3281C13.3664 13.3279 13.6025 13.092 13.6025 12.8018C13.6025 12.5115 13.3664 12.2766 13.0762 12.2764ZM13.0762 2.67285C12.7855 2.67285 12.55 2.90861 12.5498 3.19922C12.5499 3.48987 12.7855 3.72559 13.0762 3.72559C13.3667 3.72538 13.6024 3.48975 13.6025 3.19922C13.6023 2.90874 13.3666 2.67306 13.0762 2.67285Z" fill="currentColor"/>'
  + '</svg>'

// ---------------------------------------------------------------------------
// DOM 匹配工具
// ---------------------------------------------------------------------------

/** 是否为官方分支按钮（title/aria-label 宽松子串匹配，避免依赖 hash 化 class）。 */
function isBranchButton(button: Element): boolean {
  const text = `${button.getAttribute('title') ?? ''} ${button.getAttribute('aria-label') ?? ''}`
  return BRANCH_PATTERNS.some(pattern => text.includes(pattern))
}

/** 解析消息节点 seq（data-chat-anchor-key="node:{seq}"，旧版格式，保留兼容）。 */
function parseMessageSeq(node: HTMLElement): number | null {
  const match = /^node:(\d+)$/u.exec(node.getAttribute('data-chat-anchor-key') ?? '')
  if (match === null) return null
  const seq = Number(match[1])
  return Number.isInteger(seq) && seq >= 1 ? seq : null
}

/**
 * 从分支按钮解析本次克隆的回合锚点 seq。
 *
 * 当前快照里官方分支按钮位于**回合尾行**（div[data-turn-tail="{turn}"]，见
 * ui-conversation TurnTailNodeView），按钮本身不带 seq；回合号从
 * data-turn-tail 取，再用会话快照的 turnEnds（已完成回合号 → 该回合
 * turn/end 事件 seq）得到锚点。宿主边界逻辑取「第一个 seq>=atSeq 的
 * turn/end」，所以传 turn/end 自身的 seq 正好落在该回合尾。
 * @param ctx - 客户端上下文。
 * @param sessionId - 当前会话 id。
 * @param button - 被点击的分支按钮。
 * @returns 锚点 seq；无法解析（旧版 node: 格式/回合不在窗口内）时返回 null。
 */
function resolveBranchSeq(ctx: Context, sessionId: string, button: Element): number | null {
  // 新格式：回合尾行 → turnEnds。
  const tail = button.closest<HTMLElement>('[data-turn-tail]')
  if (tail !== null) {
    const turn = Number(tail.getAttribute('data-turn-tail'))
    if (Number.isInteger(turn) && turn >= 1) {
      const session = ctx.sessions.binding(sessionId as SessionId)?.session
      const turnEnd = session?.getSnapshot().turnEnds.get(turn)
      if (typeof turnEnd === 'number') return turnEnd
    }
  }
  // 旧版格式兜底：消息节点 node:{seq}。
  const node = button.closest<HTMLElement>('[data-chat-anchor-key^="node:"]')
  return node === null ? null : parseMessageSeq(node)
}

/** 在菜单里找文案精确等于某个 pattern 的 menuitem。 */
function findMenuItem(menu: HTMLElement, patterns: readonly string[]): HTMLElement | null {
  for (const item of menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
    const label = (item.textContent ?? '').trim()
    if (patterns.some(pattern => label === pattern)) return item
  }
  return null
}

/** 让官方菜单自行关闭（其关闭监听器挂在 document 的 keydown 上）。 */
function closeOpenMenu(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

// ---------------------------------------------------------------------------
// 侧边栏入口：会话解析与菜单注入
// ---------------------------------------------------------------------------

/**
 * 从会话行元素反查会话 id：
 * 1) 行内三点按钮 aria-label 包含的 displayTitle（官方模板「会话“{title}”的操作」）；
 * 2) 当前打开的会话优先（多数时候菜单就开在当前会话行）；
 * 3) 用所属工作区（组内工作区行的标题 → workspaces 视图 title → path → cwd）消歧。
 * @param ctx - 客户端上下文。
 * @param row - 会话行元素（[role="treeitem"]）。
 * @returns 唯一匹配的会话 id；无法确定时返回 null。
 */
function resolveSessionIdFromRow(ctx: Context, row: HTMLElement | null): SessionId | null {
  if (row === null) return null
  const list = ctx.sessions.list.getSnapshot()
  const ariaLabel = row.querySelector('button[aria-label]')?.getAttribute('aria-label') ?? ''
  let candidates = Object.values(list.byId).filter(summary =>
    summary.displayTitle !== undefined && summary.displayTitle !== ''
    && ariaLabel.includes(summary.displayTitle))
  if (candidates.length === 0) return null
  // 当前打开的会话优先（同一标题多会话时的最可能目标）。
  if (list.current !== undefined && candidates.some(summary => summary.id === list.current)) {
    return list.current
  }
  // 用所属工作区消歧：组内工作区行（aria-expanded 且无 aria-selected）的标题
  // 匹配 workspaces 视图 title，取其 path 过滤候选的 cwd。
  const section = row.parentElement
  const workspaceRow = section?.querySelector<HTMLElement>(':scope > [role="treeitem"][aria-expanded]')
  if (workspaceRow !== null && workspaceRow !== undefined) {
    const workspaceLabel = workspaceRow.querySelector('button[aria-label]')?.getAttribute('aria-label') ?? ''
    const workspaceMatches = ctx.workspaces.list.getSnapshot().items.filter(workspace =>
      workspace.title !== undefined && workspace.title !== ''
      && workspaceLabel.includes(workspace.title))
    if (workspaceMatches.length === 1) {
      const inWorkspace = candidates.filter(summary => summary.cwd === workspaceMatches[0].path)
      if (inWorkspace.length === 1) return inWorkspace[0].id
      if (inWorkspace.length > 0) candidates = inWorkspace
    }
  }
  return candidates.length === 1 ? candidates[0].id : null
}

/**
 * 扫描侧边栏会话行菜单：出现含「分叉会话」行的菜单时，在其后注入
 * 「分叉会话到其他工作区…」入口（原生 DOM + 内联 SVG 图标，随菜单生命周期
 * 自动销毁，无泄漏）。
 * @param ctx - 客户端上下文。
 * @param getRow - 最近一次打开菜单的会话行读取器。
 */
function injectSidebarMenuItems(ctx: Context, getRow: () => HTMLElement | null): void {
  for (const menu of document.querySelectorAll<HTMLElement>('[role="menu"]')) {
    if (menu.hasAttribute(MENU_INJECTED_ATTR)) continue
    const forkItem = findMenuItem(menu, FORK_ITEM_PATTERNS)
    if (forkItem === null) continue // 工作区菜单等不含「分叉会话」行的菜单不注入
    menu.setAttribute(MENU_INJECTED_ATTR, '')
    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute('role', 'menuitem')
    item.className = 'fw-menuitem'
    // 文案来自本插件字典，无用户输入，安全内联。
    item.innerHTML = `<span class="fw-menuitem-icon">${BRANCH_ICON_SVG}</span>`
      + `<span class="fw-menuitem-label">${t('menu.forkToWorkspace')}</span>`
    item.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      closeOpenMenu()
      const sessionId = resolveSessionIdFromRow(ctx, getRow())
      if (sessionId === null) {
        window.alert(t('dialog.resolveFailed'))
        return
      }
      openForkDialog(ctx, { sessionId })
    })
    forkItem.after(item)
  }
}

// ---------------------------------------------------------------------------
// 会话内分支按钮：启用 + 接管
// ---------------------------------------------------------------------------

/**
 * 扫描会话区：
 * - 隐藏被接管（原禁用）分支按钮旁边的官方 tooltip bubble（提示与事实不符）；
 * - 启用官方禁用的**非末尾回合**分支按钮（移除禁用属性，标题改为本插件文案），
 *   实现「任意轮克隆」；点击由 document capture 监听器统一接管。
 */
function enableBranchButtons(): void {
  const flow = document.querySelector('[data-chat-flow]')
  if (flow === null) return
  for (const bubble of flow.querySelectorAll<HTMLElement>('[role="tooltip"]')) {
    const prev = bubble.previousElementSibling
    if (prev instanceof HTMLButtonElement && prev.hasAttribute(BRANCH_ENABLED_ATTR)) {
      bubble.style.display = 'none'
    }
  }
  for (const button of flow.querySelectorAll<HTMLButtonElement>('button')) {
    if (!isBranchButton(button)) continue
    if (button.getAttribute('aria-disabled') !== 'true' && !button.disabled) continue
    if (button.hasAttribute(BRANCH_ENABLED_ATTR)) continue // 已启用（幂等）
    button.setAttribute(BRANCH_ENABLED_ATTR, '')
    button.removeAttribute('aria-disabled')
    button.removeAttribute('disabled')
    button.removeAttribute('data-unavailable')
    button.title = t('branch.enabledTip')
    button.setAttribute('aria-label', t('branch.enabledTip'))
  }
}

// ---------------------------------------------------------------------------
// 弹层 / 对话框挂载
// ---------------------------------------------------------------------------

/**
 * 打开分支二选一弹层（挂到 body，关闭即卸载）。
 * @param ctx - 客户端上下文。
 * @param anchor - 被点击的分支按钮。
 * @param sessionId - 当前会话 id。
 * @param seq - 分支锚点消息 seq。
 */
function showBranchMenu(ctx: Context, anchor: HTMLElement, sessionId: string, seq: number): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const close = (): void => {
    root.unmount()
    host.remove()
  }
  const rect = anchor.getBoundingClientRect()
  root.render(createElement(BranchMenu, {
    x: rect.left,
    y: rect.bottom + 4,
    sessionId,
    seq,
    onClose: close,
    // 克隆到当前工作区：官方客户端 fork 通道（同工作区、标题自增、打开子会话）。
    onForkToCurrent: (sid, s) => {
      close()
      ctx.sessions.fork({ sessionId: sid, atSeq: s, increaseTitle: true })
        .then(childId => { ctx.sessions.open(childId) })
        .catch((cause: unknown) => {
          window.alert(cause instanceof Error ? cause.message : String(cause))
        })
    },
    // 克隆到其他工作区：打开工作区选择对话框（带 atSeq 锚点）。
    onForkToOther: (sid, s) => {
      close()
      openForkDialog(ctx, { sessionId: sid, atSeq: s })
    },
  }))
}

/**
 * 打开工作区选择对话框（挂到 body，关闭即卸载）。
 * @param ctx - 客户端上下文。
 * @param opts - 源会话与可选分支锚点。
 */
function openForkDialog(ctx: Context, opts: { sessionId: string; atSeq?: number }): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(createElement(ForkDialog, {
    ...opts,
    ctx,
    onClose: () => {
      root.unmount()
      host.remove()
    },
  }))
}

// ---------------------------------------------------------------------------
// 插件入口
// ---------------------------------------------------------------------------

/**
 * 客户端插件入口：注入样式、挂 capture 监听器与 MutationObserver 扫描。
 * @param ctx - 客户端根上下文（sessions/workspaces 服务）。
 */
export function apply(ctx: Context): void {
  // 1) 样式注入（随插件卸载移除）。
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)
  ctx.effect(() => () => { styleEl.remove() })

  // 2) 记录最近一次打开三点菜单的会话行（capture 阶段先于 React 冒泡执行，
  //    且不阻止默认行为——只做记录）。
  let lastSessionRow: HTMLElement | null = null
  const onRowClickCapture = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button')
    if (button === null) return
    const label = button.getAttribute('aria-label') ?? ''
    if (!SESSION_ARIA_PREFIXES.some(prefix => label.startsWith(prefix))) return
    lastSessionRow = button.closest<HTMLElement>('[role="treeitem"]')
  }
  document.addEventListener('click', onRowClickCapture, true)
  ctx.effect(() => () => document.removeEventListener('click', onRowClickCapture, true))

  // 3) 接管会话内官方分支按钮：capture 阶段拦截点击（阻止其到达 React 的
  //    根监听器），弹二选一。解析不出当前会话/回合锚点时**不拦截**，让官方
  //    行为照常执行（优雅降级）。禁用按钮不派发 click，但启用扫描（见下）
  //    已把非末尾回合的禁用按钮解除。
  const onBranchClickCapture = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button')
    if (button === null) return
    if (!isBranchButton(button)) return
    if (button.closest('[data-chat-flow]') === null) return
    const current = ctx.sessions.list.getSnapshot().current
    if (current === undefined) return // 无法确定当前会话 → 交给官方行为
    const seq = resolveBranchSeq(ctx, current, button)
    if (seq === null) return // 无法确定回合锚点 → 交给官方行为
    event.preventDefault()
    event.stopPropagation()
    showBranchMenu(ctx, button, current, seq)
  }
  document.addEventListener('click', onBranchClickCapture, true)
  ctx.effect(() => () => document.removeEventListener('click', onBranchClickCapture, true))

  // 4) MutationObserver：React 重渲染会重建菜单/按钮，持续扫描保活
  //    （rAF 节流；先匹配目标特征再标记，避免错过更新）。
  let disposed = false
  let raf = 0
  const scan = (): void => {
    raf = 0
    if (disposed) return
    injectSidebarMenuItems(ctx, () => lastSessionRow)
    enableBranchButtons()
  }
  const observer = new MutationObserver(() => {
    if (raf !== 0) return
    raf = window.requestAnimationFrame(scan)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  ctx.effect(() => () => {
    disposed = true
    observer.disconnect()
    if (raf !== 0) window.cancelAnimationFrame(raf)
  })
  // 首轮扫描：页面可能已有打开中的菜单 / 已渲染的会话区。
  scan()
}
