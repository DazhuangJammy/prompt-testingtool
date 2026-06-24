import { X } from 'lucide-react'
import { useState } from 'react'
import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { QUICK_PHRASE_DEFAULT_GROUP_ID } from '../model/quickPhrases'

interface QuickPhraseEditDialogProps {
  groups: QuickPhraseGroup[]
  mode: 'add' | 'edit'
  phrase?: QuickPhrase
  onClose: () => void
  onSubmit: (draft: { title: string; content: string; groupId?: string }) => void
}

export function QuickPhraseEditDialog({
  groups,
  mode,
  phrase,
  onClose,
  onSubmit,
}: QuickPhraseEditDialogProps) {
  const [title, setTitle] = useState(phrase?.title ?? '')
  const [content, setContent] = useState(phrase?.content ?? '')
  const [groupId, setGroupId] = useState(
    phrase?.groupId ?? QUICK_PHRASE_DEFAULT_GROUP_ID,
  )
  const canSubmit = Boolean(title.trim() && content.trim())

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="quick-phrase-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          onSubmit({
            title,
            content,
            groupId:
              groupId === QUICK_PHRASE_DEFAULT_GROUP_ID ? undefined : groupId,
          })
        }}
      >
        <div className="quick-phrase-dialog-head">
          <h2>{mode === 'edit' ? '编辑短语' : '添加短语'}</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <label className="settings-field">
          <span>标题</span>
          <input
            autoFocus
            value={title}
            placeholder="请输入短语标题"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="settings-field">
          <span>分组</span>
          <select
            aria-label="短语分组"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value={QUICK_PHRASE_DEFAULT_GROUP_ID}>默认</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>内容</span>
          <textarea
            value={content}
            placeholder={[
              '请输入短语内容',
              '例如：帮我把下面这段话改得更清楚：',
            ].join('\n')}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>

        <div className="quick-phrase-dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={!canSubmit}>
            确定
          </button>
        </div>
      </form>
    </div>
  )
}
