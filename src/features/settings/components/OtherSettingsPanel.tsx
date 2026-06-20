import { Search } from 'lucide-react'
import type { SelectionMagnifierSettings } from '@/shared/model/selectionMagnifier'

interface OtherSettingsPanelProps {
  selectionMagnifier: SelectionMagnifierSettings
  onSelectionMagnifierChange: (settings: Partial<SelectionMagnifierSettings>) => void
}

export function OtherSettingsPanel({
  onSelectionMagnifierChange,
  selectionMagnifier,
}: OtherSettingsPanelProps) {
  return (
    <section className="other-settings-card">
      <div className="other-settings-head">
        <h2>其他设置</h2>
        <span>针对画布和聊天区域的辅助功能</span>
      </div>

      <div className="other-settings-feature">
        <div className="other-settings-feature-head">
          <div className="other-settings-feature-title">
            <Search size={18} />
            <div>
              <strong>放大镜</strong>
              <span>选择文字后显示悬浮按钮，点击后放大查看选中内容</span>
            </div>
          </div>
          <label className="settings-switch">
            <input
              type="checkbox"
              checked={selectionMagnifier.enabled}
              aria-label="启用放大镜"
              onChange={(event) =>
                onSelectionMagnifierChange({ enabled: event.target.checked })
              }
            />
            <span />
          </label>
        </div>

        <div className="other-settings-controls">
          <MagnifierColorField
            label="字体颜色"
            value={selectionMagnifier.textColor}
            colorLabel="放大镜字体颜色"
            textLabel="放大镜字体颜色值"
            onChange={(textColor) => onSelectionMagnifierChange({ textColor })}
          />

          <label className="settings-field">
            <span>字号</span>
            <input
              type="number"
              min={18}
              max={72}
              aria-label="放大镜字号"
              value={selectionMagnifier.fontSize}
              onChange={(event) =>
                onSelectionMagnifierChange({ fontSize: Number(event.target.value) })
              }
            />
          </label>

          <MagnifierColorField
            label="边框颜色"
            value={selectionMagnifier.borderColor}
            colorLabel="放大镜边框颜色"
            textLabel="放大镜边框颜色值"
            onChange={(borderColor) => onSelectionMagnifierChange({ borderColor })}
          />

          <label className="settings-field">
            <span>边框圆角</span>
            <input
              type="number"
              min={0}
              max={28}
              aria-label="放大镜边框圆角"
              value={selectionMagnifier.borderRadius}
              onChange={(event) =>
                onSelectionMagnifierChange({
                  borderRadius: Number(event.target.value),
                })
              }
            />
          </label>

          <MagnifierColorField
            label="背景色"
            value={selectionMagnifier.backgroundColor}
            colorLabel="放大镜背景色"
            textLabel="放大镜背景色值"
            onChange={(backgroundColor) =>
              onSelectionMagnifierChange({ backgroundColor })
            }
          />

          <label className="settings-field">
            <span>背景透明度</span>
            <input
              type="number"
              min={0}
              max={100}
              aria-label="放大镜背景透明度"
              value={selectionMagnifier.backgroundOpacity}
              onChange={(event) =>
                onSelectionMagnifierChange({
                  backgroundOpacity: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  )
}

interface MagnifierColorFieldProps {
  colorLabel: string
  label: string
  textLabel: string
  value: string
  onChange: (value: string) => void
}

function MagnifierColorField({
  colorLabel,
  label,
  onChange,
  textLabel,
  value,
}: MagnifierColorFieldProps) {
  return (
    <label className="settings-field magnifier-color-control">
      <span>{label}</span>
      <div>
        <input
          type="color"
          aria-label={colorLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          aria-label={textLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}
