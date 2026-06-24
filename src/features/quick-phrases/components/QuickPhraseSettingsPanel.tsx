import { FileText, FolderPlus, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { quickPhraseRepository } from '../infrastructure/quickPhraseRepository'
import {
  QUICK_PHRASE_ALL_GROUP_ID,
  QUICK_PHRASE_DEFAULT_GROUP_ID,
  filterQuickPhrasesByGroup,
  getQuickPhraseGroupLabel,
} from '../model/quickPhrases'
import { QuickPhraseEditDialog } from './QuickPhraseEditDialog'
import { QuickPhraseGroupDialog } from './QuickPhraseGroupDialog'

interface QuickPhraseSettingsPanelProps {
  groups: QuickPhraseGroup[]
  phrases: QuickPhrase[]
}

type PhraseDialogState =
  | { mode: 'add'; phrase?: undefined }
  | { mode: 'edit'; phrase: QuickPhrase }

export function QuickPhraseSettingsPanel({
  groups,
  phrases,
}: QuickPhraseSettingsPanelProps) {
  const [activeGroupId, setActiveGroupId] = useState(QUICK_PHRASE_ALL_GROUP_ID)
  const [phraseDialog, setPhraseDialog] = useState<PhraseDialogState>()
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const defaultCount = phrases.filter((phrase) => !phrase.groupId).length
  const activeGroupExists =
    activeGroupId === QUICK_PHRASE_ALL_GROUP_ID ||
    activeGroupId === QUICK_PHRASE_DEFAULT_GROUP_ID ||
    groups.some((group) => group.id === activeGroupId)
  const effectiveActiveGroupId = activeGroupExists
    ? activeGroupId
    : QUICK_PHRASE_ALL_GROUP_ID
  const filteredPhrases = useMemo(
    () => filterQuickPhrasesByGroup(phrases, effectiveActiveGroupId),
    [effectiveActiveGroupId, phrases],
  )

  return (
    <section className="quick-phrase-settings-card">
      <div className="quick-phrase-settings-head">
        <div>
          <h2>快捷短语</h2>
          <span>管理聊天输入框里可以快速插入或直接发送的常用短语</span>
        </div>
        <div className="quick-phrase-settings-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setGroupDialogOpen(true)}
          >
            <FolderPlus />
            <span>添加分组</span>
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setPhraseDialog({ mode: 'add' })}
          >
            <Plus />
            <span>添加短语</span>
          </button>
        </div>
      </div>

      <div className="quick-phrase-settings-layout">
        <aside className="quick-phrase-group-list" aria-label="快捷短语分组">
          <button
            type="button"
            className={
              effectiveActiveGroupId === QUICK_PHRASE_ALL_GROUP_ID
                ? 'is-active'
                : ''
            }
            onClick={() => setActiveGroupId(QUICK_PHRASE_ALL_GROUP_ID)}
          >
            <span>全部</span>
            <small>{phrases.length}</small>
          </button>
          <button
            type="button"
            className={
              effectiveActiveGroupId === QUICK_PHRASE_DEFAULT_GROUP_ID
                ? 'is-active'
                : ''
            }
            onClick={() => setActiveGroupId(QUICK_PHRASE_DEFAULT_GROUP_ID)}
          >
            <span>默认</span>
            <small>{defaultCount}</small>
          </button>
          {groups.map((group) => {
            const groupCount = phrases.filter(
              (phrase) => phrase.groupId === group.id,
            ).length
            return (
              <button
                type="button"
                className={effectiveActiveGroupId === group.id ? 'is-active' : ''}
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
              >
                <span>{group.name}</span>
                <small>{groupCount}</small>
              </button>
            )
          })}
        </aside>

        <div className="quick-phrase-list">
          {filteredPhrases.map((phrase) => (
            <article className="quick-phrase-row" key={phrase.id}>
              <FileText className="quick-phrase-row-icon" />
              <div className="quick-phrase-row-main">
                <div>
                  <strong>{phrase.title}</strong>
                  <span>{getQuickPhraseGroupLabel(groups, phrase.groupId)}</span>
                </div>
                <p>{phrase.content}</p>
              </div>
              <div className="quick-phrase-row-actions">
                <IconButton
                  icon={<Pencil />}
                  label="编辑"
                  onClick={() => setPhraseDialog({ mode: 'edit', phrase })}
                />
                <IconButton
                  icon={<Trash2 />}
                  label="删除"
                  onClick={() => {
                    if (!confirm(`删除短语「${phrase.title}」？`)) return
                    void quickPhraseRepository.deletePhrase(phrase.id)
                  }}
                />
              </div>
            </article>
          ))}

          {!filteredPhrases.length && (
            <div className="quick-phrase-empty">
              <Zap />
              <strong>还没有快捷短语</strong>
              <span>添加后，就能在聊天输入框里快速选择使用。</span>
            </div>
          )}
        </div>
      </div>

      {phraseDialog && (
        <QuickPhraseEditDialog
          key={phraseDialog.phrase?.id ?? 'add'}
          groups={groups}
          mode={phraseDialog.mode}
          phrase={phraseDialog.phrase}
          onClose={() => setPhraseDialog(undefined)}
          onSubmit={(draft) => {
            if (phraseDialog.mode === 'edit') {
              void quickPhraseRepository.updatePhrase(phraseDialog.phrase.id, draft)
            } else {
              void quickPhraseRepository.createPhrase(draft)
            }
            setPhraseDialog(undefined)
          }}
        />
      )}

      {groupDialogOpen && (
        <QuickPhraseGroupDialog
          onClose={() => setGroupDialogOpen(false)}
          onSubmit={(draft) => {
            void quickPhraseRepository.createGroup(draft)
            setGroupDialogOpen(false)
          }}
        />
      )}
    </section>
  )
}
