/**
 * dsh-fork-to-workspace — 导入会话对话框。
 *
 * 选择导出的会话包（dsh-session-*.zip，本插件/官方导出格式）→ 选择目标
 * 工作区（可选，缺省保留原目录）→ POST /dsh-fork-ws/import（body = zip
 * 字节，workspaceId 走 query）→ 成功后刷新会话列表并可打开。
 */
import * as React from 'react'
import type { Context } from 'cordis'
import { IconDownloadOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from './texts.ts'

/** 导入端点响应。 */
type ImportResponse =
  | { ok: true; sessionId: string; copiedFrom?: string; eventsImported: number; attachmentsImported: number; warnings?: readonly string[] }
  | { ok: false; error: string; code?: string }

/** 对话框状态机。 */
type Phase = 'idle' | 'importing' | 'done' | 'failed'

/** 本组件属性。 */
export interface ImportDialogProps {
  /** 客户端根上下文（sessions/workspaces 服务）。 */
  ctx: Context
  /** 预选的目标工作区 id（从工作区行菜单进入时自动带入）。 */
  defaultWorkspaceId?: string
  /** 关闭对话框。 */
  onClose: () => void
}

/**
 * 导入会话对话框组件。
 * @param props - 见 {@link ImportDialogProps}。
 * @returns 对话框元素。
 */
export function ImportDialog({ ctx, defaultWorkspaceId, onClose }: ImportDialogProps) {
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [error, setError] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [workspaceId, setWorkspaceId] = React.useState<string>(defaultWorkspaceId ?? '')
  const [result, setResult] = React.useState<{ sessionId: string; copiedFrom?: string; events: number; attachments: number } | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 工作区下拉数据（客户端快照；未就绪时显示空列表提示）。
  const workspaces = ctx.workspaces.list.getSnapshot().items

  // 点击遮罩（对话框外部）或按 Escape 关闭；导入中禁止关闭。
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (phase === 'importing') return
      if (!(event.target instanceof Node)) return
      if (rootRef.current?.contains(event.target) === true) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== 'importing' && event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [phase, onClose])

  /** 选择 zip 文件。 */
  const pickFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const picked = event.target.files?.[0] ?? null
    setFile(picked)
    setPhase('idle')
    setError('')
  }

  /** 执行导入。 */
  const runImport = (): void => {
    if (file === null || phase === 'importing') return
    setPhase('importing')
    setError('')
    const query = workspaceId === '' ? '' : `?workspaceId=${encodeURIComponent(workspaceId)}`
    void fetch(`/dsh-fork-ws/import${query}`, { method: 'POST', body: file })
      .then(res => res.json() as Promise<ImportResponse>)
      .then(async (data) => {
        if (!data.ok) {
          setPhase('failed')
          setError(t('import.failed', { message: data.error }))
          return
        }
        setResult({ sessionId: data.sessionId, ...(data.copiedFrom === undefined ? {} : { copiedFrom: data.copiedFrom }), events: data.eventsImported, attachments: data.attachmentsImported })
        setPhase('done')
        // 刷新会话列表，让导入的会话进入客户端快照（refresh 在运行时公开，
        // 但不在 ISessions 接口类型上，这里按运行时形状调用）。
        const sessionsRuntime = ctx.sessions as unknown as { refresh: () => Promise<void> }
        await sessionsRuntime.refresh().catch(() => {})
      })
      .catch((cause: unknown) => {
        setPhase('failed')
        setError(t('import.failed', {
          message: cause instanceof Error ? cause.message : String(cause),
        }))
      })
  }

  /** 打开导入的会话（等待其进入客户端列表）。 */
  const openImported = async (): Promise<void> => {
    if (result === null) return
    const deadline = Date.now() + 6000
    while (Date.now() < deadline) {
      if (ctx.sessions.list.getSnapshot().byId[result.sessionId] !== undefined) break
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    try {
      ctx.sessions.open(result.sessionId)
      onClose()
    } catch {
      // 列表尚未同步：提示用户稍后手动打开。
      setError(t('import.failed', { message: result.sessionId }))
    }
  }

  /** 文件大小格式化。 */
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  }

  return (
    <div className="fw-overlay">
      <div ref={rootRef} className="fw-dialog" role="dialog" aria-modal="true">
        <h2 className="fw-dialog-title">
          <span className="fw-menuitem-icon"><IconDownloadOutline16 /></span>
          {t('import.title')}
        </h2>
        <p className="fw-dialog-hint">{t('import.note')}</p>

        {/* 文件选择 */}
        <div className="fw-dialog-section">{t('import.file')}</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={pickFile}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="fw-btn fw-import-browse"
          onClick={() => { fileInputRef.current?.click() }}
          disabled={phase === 'importing'}
        >
          {t('import.browse')}
        </button>
        {file !== null && (
          <p className="fw-dialog-source">{t('import.picked', {
            name: file.name,
            size: formatSize(file.size),
          })}</p>
        )}

        {/* 目标工作区（可选） */}
        <div className="fw-dialog-section">{t('import.workspace')}</div>
        <select
          className="fw-import-workspace-select"
          value={workspaceId}
          onChange={event => { setWorkspaceId(event.target.value) }}
          disabled={phase === 'importing'}
        >
          <option value="">{t('import.keep')}</option>
          {workspaces.map(workspace => (
            <option key={workspace.workspaceId} value={workspace.workspaceId}>
              {workspace.title} — {workspace.path}
            </option>
          ))}
        </select>

        <p className="fw-dialog-hint">{t('import.warning')}</p>

        {phase === 'failed' && error !== '' && (
          <div className="fw-dialog-error">{error}</div>
        )}

        {phase === 'done' && result !== null && (
          <>
            <div className="fw-dialog-success">
              {t('import.success', {
                sessionId: result.sessionId,
                events: String(result.events),
                attachments: String(result.attachments),
              })}
            </div>
            {result.copiedFrom !== undefined && (
              <div className="fw-dialog-hint">
                {t('import.copied', { from: result.copiedFrom, to: result.sessionId })}
              </div>
            )}
          </>
        )}

        {phase === 'importing' && <p className="fw-dialog-hint">{t('import.importing')}</p>}

        <div className="fw-dialog-footer">
          <button
            type="button"
            className="fw-btn"
            onClick={onClose}
            disabled={phase === 'importing'}
          >
            {t('dialog.cancel')}
          </button>
          {phase === 'done'
            ? (
              <button type="button" className="fw-btn fw-btn-primary" onClick={() => { void openImported() }}>
                {t('import.open')}
              </button>
            )
            : (
              <button
                type="button"
                className="fw-btn fw-btn-primary"
                onClick={runImport}
                disabled={file === null || phase === 'importing'}
              >
                {phase === 'importing' ? t('import.importing') : t('import.button')}
              </button>
            )}
        </div>
      </div>
    </div>
  )
}
