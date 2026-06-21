import { Bot, FolderSearch, ShieldCheck, Terminal } from 'lucide-react'
import { useState } from 'react'
import type { SkillsLabSettings } from '@/shared/types'
import { normalizeSkillsLabSettings } from '@/features/skills-lab/model/skillSettings'

interface SkillsLabSettingsPanelProps {
  settings?: SkillsLabSettings
  onSave: (settings: SkillsLabSettings) => void
}

export function SkillsLabSettingsPanel({
  settings,
  onSave,
}: SkillsLabSettingsPanelProps) {
  const [draft, setDraft] = useState(() => normalizeSkillsLabSettings(settings))
  const [lastSettings, setLastSettings] = useState(settings)
  const [saved, setSaved] = useState(false)

  if (settings !== lastSettings) {
    setLastSettings(settings)
    setDraft(normalizeSkillsLabSettings(settings))
  }

  const save = () => {
    onSave(normalizeSkillsLabSettings(draft))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  return (
    <section className="skills-settings-panel">
      <div className="settings-panel-head">
        <div>
          <h2>Skills 设置</h2>
          <p>选择 Skills Lab 调用的本地 agent。画布只保存映射结果，真实文件仍在本地目录中。</p>
        </div>
        {saved && <span className="settings-save-status">已保存</span>}
      </div>

      <div className="settings-field-grid">
        <label className="settings-field">
          <span>
            <Bot size={16} />
            默认工具
          </span>
          <select
            value={draft.defaultTool}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                defaultTool: event.target.value as SkillsLabSettings['defaultTool'],
              }))
            }
          >
            <option value="codex">Codex</option>
            <option value="claude-code">Claude Code</option>
            <option value="openclaw">OpenClaw</option>
            <option value="mock">Mock 兜底</option>
          </select>
          <small>第一版真实接入 Codex，其他工具先保存为配置。</small>
        </label>

        <label className="settings-field">
          <span>
            <Terminal size={16} />
            工具命令
          </span>
          <input
            value={draft.toolCommand}
            placeholder="codex"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                toolCommand: event.target.value,
              }))
            }
          />
          <small>例如 codex。工具需要能被本地 server 所在终端找到。</small>
        </label>

        <label className="settings-field">
          <span>
            <FolderSearch size={16} />
            默认 Skills 目录
          </span>
          <input
            value={draft.defaultSkillsDirectory}
            placeholder="/Users/you/.codex/skills"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                defaultSkillsDirectory: event.target.value,
              }))
            }
          />
          <small>用于“选择 Skill”时扫描本地 skill 文件夹。</small>
        </label>

        <label className="settings-field">
          <span>
            <ShieldCheck size={16} />
            写入权限
          </span>
          <select
            value={draft.permissionMode}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                permissionMode: event.target
                  .value as SkillsLabSettings['permissionMode'],
              }))
            }
          >
            <option value="read-only">只读解析</option>
            <option value="allow-write">允许外部 agent 写入</option>
          </select>
          <small>建议默认只读。允许写入时，修改仍应先确认需求。</small>
        </label>

        <div className="settings-toggle-list">
          <label>
            <input
              type="checkbox"
              checked={draft.autoRunChecks}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  autoRunChecks: event.target.checked,
                }))
              }
            />
            <span>解读后自动运行检查</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.requireChangeConfirmation}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  requireChangeConfirmation: event.target.checked,
                }))
              }
            />
            <span>修改请求需要二次确认</span>
          </label>
        </div>
      </div>

      <div className="provider-detail-actions">
        <button type="button" onClick={save}>
          保存设置
        </button>
      </div>
    </section>
  )
}
