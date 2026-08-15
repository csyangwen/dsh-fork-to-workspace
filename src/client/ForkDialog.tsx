/**
 * dsh-fork-to-workspace — 工作区选择对话框。
 *
 * 流程：打开 → GET /dsh-fork-ws/prepare 取「源会话信息 + 现有工作区列表 +
 * 可选预设列表」→ 用户点选目标工作区（可选换预设）→ POST /dsh-fork-ws/fork
 * （可带 atSeq 指定分支边界、agentPreset 指定子会话预设）→ 等待子会话出现
 * 在客户端会话列表 → 打开子会话。
 */
import * as React from 'react'
import type { Context } from 'cordis'
import { IconFolderOpen16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from './texts.ts'

/** 可选的 agent 预设（来自宿主 agentPresets.list() 的投影）。 */
interface PresetOption {
  id: string
  /** system = 随部署内置；user = 本机自建（含插件提供的预设）。 */
  trust: 'system' | 'user'
  name?: string
  description?: string
  /** 配置损坏的预设：不可选（下拉禁用），hover 显示原因。 */
  broken?: string
  isDefault: boolean
}

/** 宿主 prepare 端点响应。 */
type PrepareResponse =
  | {
    ok: true
    source: { sessionId: string; title: string | null; workspaceId: string | null; presetId: string | null }
    workspaces: readonly { workspaceId: string; title: string; path: string }[]
    presets: readonly PresetOption[]
  }
  | { ok: false; error: string; code?: string }

/** 宿主 fork 端点响应。 */
type ForkResponse =
  | { ok: true; childId: string }
  | { ok: false; error: string; code?: string }

/** 对话框状态机：加载中 → 就绪（可选目标）→ 克隆中 → 已克隆待打开 / 失败。 */
type Phase = 'loading' | 'ready' | 'forking' | 'opening' | 'failed'

/** 本组件属性。 */
export interface ForkDialogProps {
  /** 源会话 id。 */
  sessionId: string
  /** 可选分支锚点（消息事件 seq）；缺省 = 克隆到最后一个已完成回合。 */
  atSeq?: number
  /** 客户端根上下文（sessions/workspaces 服务）。 */
  ctx: Context
  /** 关闭对话框。 */
  onClose: () => void
}

/**
 * 等待子会话出现在客户端会话列表中（host 帧到达有延迟）。
 * @param ctx - 客户端上下文。
 * @param childId - 子会话 id。
 * @param timeoutMs - 最长等待毫秒数。
 * @returns 是否在超时前出现。
 */
async function waitForSession(ctx: Context, childId: string, timeoutMs = 6000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (ctx.sessions.list.getSnapshot().byId[childId] !== undefined) return true
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  return false
}

/**
 * 工作区选择对话框组件。
 * @param props - 见 {@link ForkDialogProps}。
 * @returns 对话框元素。
 */
export function ForkDialog({ sessionId, atSeq, ctx, onClose }: ForkDialogProps) {
  const [phase, setPhase] = React.useState<Phase>('loading')
  const [error, setError] = React.useState('')
  const [sourceTitle, setSourceTitle] = React.useState(sessionId)
  const [workspaces, setWorkspaces] = React.useState<readonly { workspaceId: string; title: string; path: string }[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  // 可选预设：'' = 保持源会话预设（默认，向后兼容）；否则为预设 id。
  const [presetChoice, setPresetChoice] = React.useState('')
  const [presets, setPresets] = React.useState<readonly PresetOption[]>([])
  const [sourcePreset, setSourcePreset] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  // 打开时拉取源会话信息、工作区列表与可选预设列表。
  React.useEffect(() => {
    let cancelled = false
    void fetch(`/dsh-fork-ws/prepare?sessionId=${encodeURIComponent(sessionId)}`)
      .then(res => res.json() as Promise<PrepareResponse>)
      .then((data) => {
        if (cancelled) return
        if (!data.ok) {
          setPhase('failed')
          setError(data.error)
          return
        }
        setSourceTitle(data.source.title ?? sessionId)
        setSourcePreset(data.source.presetId)
        // 排除源会话自身的工作区（「克隆到其他工作区」语义）。
        setWorkspaces(data.workspaces.filter(workspace => workspace.workspaceId !== data.source.workspaceId))
        // 预设列表：排除 broken 的之后仍可展示（禁用态）；空列表时隐藏下拉。
        setPresets(data.presets)
        setPhase('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setPhase('failed')
        setError(t('dialog.loadFailed', {
          message: cause instanceof Error ? cause.message : String(cause),
        }))
      })
    return () => { cancelled = true }
  }, [sessionId])

  // 点击遮罩（对话框外部）或按 Escape 关闭。
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

  /** 确认克隆：调用宿主 fork API，成功后等待子会话进入列表并打开。 */
  const confirm = (): void => {
    if (selected === null || phase !== 'ready') return
    setPhase('forking')
    setError('')
    void fetch('/dsh-fork-ws/fork', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        workspaceId: selected,
        ...(atSeq === undefined ? {} : { atSeq }),
        // 未选预设（'' = 保持源会话预设）时不传，宿主端继承源预设。
        ...(presetChoice === '' ? {} : { agentPreset: presetChoice }),
      }),
    })
      .then(res => res.json() as Promise<ForkResponse>)
      .then(async (data) => {
        if (!data.ok) {
          setPhase('failed')
          setError(t('dialog.failed', { message: data.error }))
          return
        }
        setPhase('opening')
        // 等待 host 帧把子会话推进客户端列表（官方 fork 同步合并，这里稍等）。
        await waitForSession(ctx, data.childId)
        try {
          ctx.sessions.open(data.childId)
        } catch {
          // 列表尚未同步也视为成功：子会话稍后出现在侧边栏，用户可手动打开。
        }
        onClose()
      })
      .catch((cause: unknown) => {
        setPhase('failed')
        setError(t('dialog.failed', {
          message: cause instanceof Error ? cause.message : String(cause),
        }))
      })
  }

  const busy = phase === 'forking' || phase === 'opening'

  return (
    <div className="fw-overlay">
      <div ref={rootRef} className="fw-dialog" role="dialog" aria-modal="true">
        <h2 className="fw-dialog-title">
          <span className="fw-menuitem-icon"><IconFolderOpen16 /></span>
          {t('dialog.title')}
        </h2>
        <p className="fw-dialog-source">{t('dialog.source', { name: sourceTitle })}</p>

        {phase === 'loading' && <p className="fw-dialog-hint">…</p>}

        {phase === 'failed' && error !== '' && (
          <div className="fw-dialog-error">{error}</div>
        )}

        {phase === 'ready' && (
          <>
            {presets.length > 0 && (
              <div className="fw-dialog-preset">
                <div className="fw-dialog-section">{t('dialog.preset')}</div>
                <select
                  className="fw-preset-select"
                  value={presetChoice}
                  onChange={(event) => { setPresetChoice(event.target.value) }}
                  aria-label={t('dialog.preset')}
                >
                  {/* 第一项：保持源会话预设（缺省，向后兼容）。 */}
                  <option value="">
                    {t('dialog.preset.keep', {
                      preset: sourcePreset === null ? t('dialog.preset.keepNone') : sourcePreset,
                    })}
                  </option>
                  {presets.map(preset => (
                    <option
                      key={preset.id}
                      value={preset.id}
                      disabled={preset.broken !== undefined}
                      title={preset.broken === undefined
                        ? undefined
                        : t('dialog.preset.broken', { reason: preset.broken })}
                    >
                      {preset.name === undefined ? preset.id : preset.name}
                      {' '}({preset.id})
                      {preset.trust === 'system' ? ` · ${t('dialog.preset.system')}` : ` · ${t('dialog.preset.user')}`}
                      {preset.isDefault ? ` · ${t('dialog.preset.default')}` : ''}
                      {preset.broken !== undefined ? ` · ${t('dialog.preset.brokenShort')}` : ''}
                    </option>
                  ))}
                </select>
                <p className="fw-dialog-hint">{t('dialog.preset.hint')}</p>
              </div>
            )}

            <div className="fw-dialog-section">{t('dialog.workspace')}</div>
            {workspaces.length === 0 ? (
              <p className="fw-dialog-hint">{t('dialog.noOtherWorkspace')}</p>
            ) : (
              <div className="fw-workspace-list">
                {workspaces.map(workspace => (
                  <button
                    key={workspace.workspaceId}
                    type="button"
                    className={selected === workspace.workspaceId
                      ? 'fw-workspace-row fw-selected'
                      : 'fw-workspace-row'}
                    onClick={() => { setSelected(workspace.workspaceId) }}
                  >
                    <span className="fw-workspace-text">
                      <span className="fw-workspace-title">{workspace.title}</span>
                      <br />
                      <span className="fw-workspace-path" title={workspace.path}>{workspace.path}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {busy && <p className="fw-dialog-hint">{phase === 'forking' ? t('dialog.forking') : t('dialog.opening')}</p>}

        <div className="fw-dialog-footer">
          <button type="button" className="fw-btn" onClick={onClose} disabled={busy}>
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            className="fw-btn fw-btn-primary"
            onClick={confirm}
            disabled={selected === null || phase !== 'ready'}
          >
            {t('dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
