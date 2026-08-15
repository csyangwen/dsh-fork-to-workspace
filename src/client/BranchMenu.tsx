/**
 * dsh-fork-to-workspace — 分支二选一弹层。
 *
 * 会话内每个已完成轮次的官方「在新对话中分支」按钮被本插件接管：点击后不再
 * 直接分叉，而是弹出本组件，让用户二选一：
 *   1. 克隆到当前工作区 —— 走官方客户端 fork 通道（同工作区，标题自增）；
 *   2. 克隆到其他工作区… —— 打开工作区选择对话框（本插件宿主 API）。
 */
import * as React from 'react'
import { IconBranchOutline16, IconFolderOpen16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from './texts.ts'

/** 本组件属性。 */
export interface BranchMenuProps {
  /** 弹层锚点坐标（fixed 定位，取自被点击按钮的 rect）。 */
  x: number
  y: number
  /** 源会话 id（当前打开的会话）。 */
  sessionId: string
  /** 分支锚点：消息事件 seq（边界=该消息所在回合的结束）。 */
  seq: number
  /** 关闭弹层。 */
  onClose: () => void
  /** 克隆到当前工作区（官方通道）。 */
  onForkToCurrent: (sessionId: string, seq: number) => void
  /** 克隆到其他工作区（打开对话框）。 */
  onForkToOther: (sessionId: string, seq: number) => void
}

/**
 * 分支二选一弹层组件。
 * @param props - 见 {@link BranchMenuProps}。
 * @returns 菜单元素。
 */
export function BranchMenu({ x, y, sessionId, seq, onClose, onForkToCurrent, onForkToOther }: BranchMenuProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  // 点击弹层外部或按 Escape 关闭（与官方 Menu 的关闭语义一致）。
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (rootRef.current?.contains(event.target) === true) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={rootRef}
      className="fw-popover fw-branch-menu"
      role="menu"
      style={{ left: x, top: y }}
    >
      <div className="fw-popover-label">{t('branch.menuTitle')}</div>
      <button
        type="button"
        role="menuitem"
        className="fw-menuitem"
        onClick={() => { onForkToCurrent(sessionId, seq) }}
      >
        <span className="fw-menuitem-icon"><IconBranchOutline16 /></span>
        <span className="fw-menuitem-label">{t('branch.toCurrent')}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="fw-menuitem"
        onClick={() => { onForkToOther(sessionId, seq) }}
      >
        <span className="fw-menuitem-icon"><IconFolderOpen16 /></span>
        <span className="fw-menuitem-label">{t('branch.toOther')}</span>
      </button>
    </div>
  )
}
