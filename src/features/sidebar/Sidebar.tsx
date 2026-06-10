import {
  Download,
  Pencil,
  FileInput,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from 'lucide-react'
import type { ChangeEvent, CSSProperties, PointerEvent } from 'react'
import { IconButton } from '@/shared/ui/IconButton'
import { hideTooltip, showTooltip } from '@/shared/ui/tooltip'
import type { Canvas } from '@/shared/types'

interface SidebarProps {
  canvases: Canvas[]
  activeCanvasId?: string
  collapsed: boolean
  onToggle: () => void
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onExport: () => void
  onImport: (file: File) => void
  onResizeStart: (event: PointerEvent) => void
  width: number
}

export function Sidebar({
  canvases,
  activeCanvasId,
  collapsed,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onExport,
  onImport,
  onResizeStart,
  width,
}: SidebarProps) {
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImport(file)
    event.target.value = ''
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}
      style={{ '--panel-width': `${width}px` } as CSSProperties}
    >
      <div className="sidebar-head">
        {!collapsed && <span className="app-mark">Prompt</span>}
        <IconButton
          icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          label={collapsed ? '展开' : '收起'}
          onClick={onToggle}
        />
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-actions">
            <IconButton icon={<Plus />} label="新建" onClick={onCreate} />
            <label
              className="icon-button file-button"
              data-tooltip="导入"
              onBlur={hideTooltip}
              onClick={hideTooltip}
              onFocus={(event) => showTooltip(event.currentTarget, '导入')}
              onMouseEnter={(event) => showTooltip(event.currentTarget, '导入')}
              onMouseLeave={hideTooltip}
              onPointerDown={hideTooltip}
            >
              <FileInput />
              <input accept="application/json" type="file" onChange={handleImport} />
            </label>
            <IconButton icon={<Download />} label="导出" onClick={onExport} />
          </div>

          <div className="canvas-list">
            {canvases.map((canvas) => (
              <div
                className={`canvas-row ${
                  canvas.id === activeCanvasId ? 'is-active' : ''
                }`}
                key={canvas.id}
              >
                <button
                  type="button"
                  onClick={() => onSelect(canvas.id)}
                >
                  {canvas.title}
                </button>
                <IconButton
                  icon={<Pencil />}
                  label="命名"
                  onClick={() => {
                    const next = prompt('重命名', canvas.title)
                    if (next) onRename(canvas.id, next)
                  }}
                />
                <IconButton
                  icon={<Trash2 />}
                  label="删除"
                  onClick={() => onDelete(canvas.id)}
                />
              </div>
            ))}
          </div>
        </>
      )}
      {!collapsed && (
        <button
          type="button"
          className="panel-resizer is-right"
          aria-label="调整宽度"
          onPointerDown={onResizeStart}
        />
      )}
    </aside>
  )
}
