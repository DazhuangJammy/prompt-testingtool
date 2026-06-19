import { RotateCcw } from 'lucide-react'
import {
  CANVAS_TOOL_ORDER,
  canvasToolLabels,
  defaultCanvasToolShortcuts,
  normalizeCanvasShortcutKey,
  type CanvasTool,
  type CanvasToolShortcuts,
} from '@/shared/model/canvasToolShortcuts'

interface ShortcutSettingsPanelProps {
  shortcuts: CanvasToolShortcuts
  onReset: () => void
  onSaveShortcut: (tool: CanvasTool, key: string) => void
}

export function ShortcutSettingsPanel({
  onReset,
  onSaveShortcut,
  shortcuts,
}: ShortcutSettingsPanelProps) {
  return (
    <section className="shortcut-settings-card">
      <div className="shortcut-settings-head">
        <div>
          <h2>快捷键设置</h2>
          <span>画布空白处激活后可用</span>
        </div>
        <button type="button" className="secondary-button" onClick={onReset}>
          <RotateCcw size={16} />
          恢复默认
        </button>
      </div>

      <div className="shortcut-settings-list">
        {CANVAS_TOOL_ORDER.map((tool) => (
          <label key={tool} className="shortcut-settings-row">
            <span>{canvasToolLabels[tool]}</span>
            <input
              aria-label={`${canvasToolLabels[tool]}快捷键`}
              maxLength={1}
              placeholder={(defaultCanvasToolShortcuts[tool] || '').toUpperCase()}
              value={(shortcuts[tool] || '').toUpperCase()}
              onChange={(event) =>
                onSaveShortcut(tool, normalizeCanvasShortcutKey(event.target.value))
              }
              onKeyDown={(event) => {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                  event.preventDefault()
                  onSaveShortcut(tool, '')
                  return
                }

                if (event.key.length !== 1) return
                event.preventDefault()
                onSaveShortcut(tool, event.key)
              }}
            />
          </label>
        ))}
      </div>
    </section>
  )
}
