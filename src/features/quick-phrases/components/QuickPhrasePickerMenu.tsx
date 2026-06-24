import { Send, Zap } from 'lucide-react'
import type { CSSProperties, PointerEventHandler } from 'react'
import { useMemo, useState } from 'react'
import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import {
  QUICK_PHRASE_ALL_GROUP_ID,
  QUICK_PHRASE_DEFAULT_GROUP_ID,
  filterQuickPhrasesByGroup,
  getQuickPhraseGroupLabel,
} from '../model/quickPhrases'

interface QuickPhrasePickerMenuProps {
  groups: QuickPhraseGroup[]
  phrases: QuickPhrase[]
  style?: CSSProperties
  onInsert: (phrase: QuickPhrase) => void
  onPointerDown?: PointerEventHandler<HTMLDivElement>
  onSend: (phrase: QuickPhrase) => void
}

export function QuickPhrasePickerMenu({
  groups,
  onInsert,
  onPointerDown,
  onSend,
  phrases,
  style,
}: QuickPhrasePickerMenuProps) {
  const [groupId, setGroupId] = useState(QUICK_PHRASE_ALL_GROUP_ID)
  const [directSend, setDirectSend] = useState(false)
  const visiblePhrases = useMemo(
    () => filterQuickPhrasesByGroup(phrases, groupId),
    [groupId, phrases],
  )

  return (
    <div
      className="composer-menu quick-phrase-picker-menu"
      style={style}
      onPointerDown={onPointerDown}
    >
      <div className="quick-phrase-picker-controls">
        <label className="quick-phrase-picker-select">
          <span>分组</span>
          <select
            aria-label="快捷短语分组"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value={QUICK_PHRASE_ALL_GROUP_ID}>全部</option>
            <option value={QUICK_PHRASE_DEFAULT_GROUP_ID}>默认</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="quick-phrase-direct-send">
          <span>直接发送</span>
          <span className="settings-switch">
            <input
              type="checkbox"
              checked={directSend}
              aria-label="直接发送"
              onChange={(event) => setDirectSend(event.target.checked)}
            />
            <span />
          </span>
        </label>
      </div>

      <div className="quick-phrase-picker-list">
        {visiblePhrases.map((phrase) => (
          <button
            type="button"
            key={phrase.id}
            onClick={() => {
              if (directSend) onSend(phrase)
              else onInsert(phrase)
            }}
          >
            <span className="quick-phrase-picker-main">
              {directSend ? <Send /> : <Zap />}
              <span>
                <strong>{phrase.title}</strong>
                <small>{phrase.content}</small>
              </span>
            </span>
            <small>{getQuickPhraseGroupLabel(groups, phrase.groupId)}</small>
          </button>
        ))}
        {!visiblePhrases.length && (
          <div className="quick-phrase-picker-empty">
            <strong>暂无快捷短语</strong>
            <span>先到设置里添加短语。</span>
          </div>
        )}
      </div>
    </div>
  )
}
