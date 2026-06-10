import { Check, ExternalLink, RefreshCw, UploadCloud } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkAppUpdate,
  runAppUpdate,
  type AppUpdateStatus,
} from '@/shared/api/appUpdate'
import { IconButton } from '@/shared/ui/IconButton'

export function AppVersionBadge() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AppUpdateStatus>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const refreshStatus = useCallback(async (showMessage = true) => {
    setBusy(true)
    if (showMessage) setMessage('')
    try {
      const next = await checkAppUpdate()
      setStatus(next)
      if (showMessage) setMessage(next.hasUpdate ? '发现新版本' : '已经是最新版本')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '检查更新失败')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (!status) {
      window.setTimeout(() => void refreshStatus(false), 0)
    }
    const closeOnPointer = (event: PointerEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, refreshStatus, status])

  const update = async () => {
    setBusy(true)
    setMessage('正在更新，完成后服务会自动重启')
    try {
      const result = await runAppUpdate()
      setMessage(result.message || '更新完成，服务正在重启')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }

  const version = status?.version ? `v${status.version}` : 'v0.0.0'

  return (
    <div className="version-shell" ref={popoverRef}>
      <button
        type="button"
        className={`version-badge ${status?.hasUpdate ? 'has-update' : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        {version}
      </button>

      {open && (
        <div className="version-popover">
          <div className="version-popover-head">
            <strong>当前版本</strong>
            <IconButton
              icon={<RefreshCw />}
              label="检查更新"
              disabled={busy}
              onClick={() => void refreshStatus()}
            />
          </div>
          <div className="version-popover-body">
            <div className="version-number">
              <span>{version}</span>
              {!status?.hasUpdate && status?.currentCommit && (
                <span className="version-ok">
                  <Check />
                </span>
              )}
            </div>
            <p>
              {status?.hasUpdate
                ? `发现新版本 ${shortCommit(status.remoteCommit)}`
                : status?.currentCommit
                  ? '已经是最新版本'
                  : '点击刷新检查 GitHub 更新'}
            </p>
            {message && <small>{message}</small>}
            <div className="version-actions">
              <a href={status?.releaseUrl} target="_blank" rel="noreferrer">
                <ExternalLink />
                查看发布
              </a>
              <button
                type="button"
                disabled={busy || !status?.hasUpdate}
                onClick={() => void update()}
              >
                <UploadCloud />
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function shortCommit(value?: string) {
  return value ? value.slice(0, 7) : ''
}
