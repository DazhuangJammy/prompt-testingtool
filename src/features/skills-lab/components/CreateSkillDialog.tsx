import { Bot, X } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface CreateSkillDialogProps {
  busy: boolean
  open: boolean
  onClose: () => void
  onCreate: (prompt: string) => void
}

export function CreateSkillDialog({
  busy,
  open,
  onClose,
  onCreate,
}: CreateSkillDialogProps) {
  const [prompt, setPrompt] = useState('')

  if (!open) return null

  const submit = () => {
    if (!prompt.trim() || busy) return
    onCreate(prompt)
  }

  const close = () => {
    setPrompt('')
    onClose()
  }

  return (
    <div className="dialog-backdrop">
      <section className="skill-path-dialog">
        <div className="dialog-head">
          <span>新建 Skill</span>
          <IconButton icon={<X />} label="关闭" onClick={close} />
        </div>
        <div className="skill-path-body">
          <label className="settings-field">
            <span>
              <Bot size={16} />
              需求描述
            </span>
            <textarea
              value={prompt}
              placeholder="例如：创建一个用于审查 React 组件可访问性的 skill"
              onChange={(event) => setPrompt(event.target.value)}
            />
            <small>会调用 Skills 设置中的外部 agent，在默认 Skills 目录中创建真实文件。</small>
          </label>
          <div className="provider-detail-actions">
            <button type="button" disabled={busy || !prompt.trim()} onClick={submit}>
              {busy ? '创建中' : '调用外部 agent 创建'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
