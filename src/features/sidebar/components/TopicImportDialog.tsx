import { FileInput, X } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import type { Canvas } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface TopicImportDialogProps {
  activeCanvasId?: string
  canvases: Canvas[]
  onClose: () => void
  onImport: (file: File, targetCanvasId?: string) => Promise<void>
}

export function TopicImportDialog({
  activeCanvasId,
  canvases,
  onClose,
  onImport,
}: TopicImportDialogProps) {
  const [targetCanvasId, setTargetCanvasId] = useState(activeCanvasId ?? '')
  const [file, setFile] = useState<File>()
  const [error, setError] = useState('')
  const hasCanvases = canvases.length > 0
  const canImport = Boolean(file) && (!hasCanvases || targetCanvasId)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0])
    setError('')
  }

  const handleImport = async () => {
    if (!file || (hasCanvases && !targetCanvasId)) return
    try {
      await onImport(file, hasCanvases ? targetCanvasId : undefined)
      onClose()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '导入失败')
    }
  }

  return (
    <div className="sidebar-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="topic-import-title"
        className="topic-import-dialog"
        role="dialog"
      >
        <header>
          <h2 id="topic-import-title">导入话题</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </header>

        <div className="topic-import-body">
          <label>
            <span>目标工作台</span>
            <select
              disabled={!hasCanvases}
              value={hasCanvases ? targetCanvasId : ''}
              onChange={(event) => setTargetCanvasId(event.target.value)}
            >
              {hasCanvases ? (
                <>
                  <option value="">选择工作台</option>
                  {canvases.map((canvas) => (
                    <option key={canvas.id} value={canvas.id}>
                      {canvas.title}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">导入时自动创建工作台</option>
              )}
            </select>
          </label>

          <label className="topic-import-file">
            <span>话题文件</span>
            <div>
              <FileInput aria-hidden="true" />
              <span>{file?.name ?? '选择 JSON 文件'}</span>
              <input accept="application/json" type="file" onChange={handleFileChange} />
            </div>
          </label>

          {error && <p className="topic-import-error">{error}</p>}
        </div>

        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canImport}
            onClick={() => void handleImport()}
          >
            导入
          </button>
        </footer>
      </section>
    </div>
  )
}
