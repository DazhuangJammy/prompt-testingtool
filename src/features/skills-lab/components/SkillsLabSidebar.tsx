import { Bot, CircleAlert, FilePlus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { AppVersionBadge } from '@/features/sidebar/components/AppVersionBadge'
import { WorkspaceRailNav } from '@/features/sidebar/components/WorkspaceRailNav'
import { SkillTopicActionsMenu } from '@/features/skills-lab/components/SkillTopicActionsMenu'
import type {
  SkillTopic,
  SkillsLabSettings,
  ThemeMode,
  WorkspaceMode,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface SkillsLabSidebarProps {
  activeTopicId?: string
  collapsed: boolean
  mode: WorkspaceMode
  settings?: SkillsLabSettings
  theme: ThemeMode
  topics: SkillTopic[]
  width: number
  onAnalyzeTopic: (topic: SkillTopic) => void
  onCreateSkill: (topic: SkillTopic) => void
  onCreateTopic: () => void
  onDeleteTopic: (topic: SkillTopic) => void
  onDuplicateTopic: (topic: SkillTopic) => void
  onModeChange: (mode: WorkspaceMode) => void
  onOpenFolder: (topic: SkillTopic) => void
  onOpenSettings: () => void
  onRenameTopic: (topic: SkillTopic) => void
  onReorderTopics: (draggedId: string, targetId: string) => Promise<void>
  onResizeStart: (event: React.PointerEvent) => void
  onSelectSkill: (topic: SkillTopic) => void
  onSelectTopic: (topicId: string) => void
  onToggle: () => void
  onToggleTheme: () => void
  onUnbindSkill: (topic: SkillTopic) => void
}

export function SkillsLabSidebar({
  activeTopicId,
  collapsed,
  mode,
  theme,
  topics,
  width,
  onAnalyzeTopic,
  onCreateSkill,
  onCreateTopic,
  onDeleteTopic,
  onDuplicateTopic,
  onModeChange,
  onOpenFolder,
  onOpenSettings,
  onRenameTopic,
  onReorderTopics,
  onResizeStart,
  onSelectSkill,
  onSelectTopic,
  onToggle,
  onToggleTheme,
  onUnbindSkill,
}: SkillsLabSidebarProps) {
  const [toastMessage, setToastMessage] = useState('')
  const [draggingTopicId, setDraggingTopicId] = useState<string>()
  const [dragOverTopicId, setDragOverTopicId] = useState<string>()

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(''), 1400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const clearDragState = () => {
    setDraggingTopicId(undefined)
    setDragOverTopicId(undefined)
  }

  const showActionResult = (action: () => void, message: string) => {
    action()
    setToastMessage(message)
  }

  return (
    <aside
      className={`sidebar skills-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      style={{ '--panel-width': `${width}px` } as CSSProperties}
    >
      <WorkspaceRailNav
        collapsed={collapsed}
        mode={mode}
        theme={theme}
        onModeChange={onModeChange}
        onOpenSettings={onOpenSettings}
        onToggle={onToggle}
        onToggleTheme={onToggleTheme}
      />

      <div className="sidebar-head">
        {!collapsed && (
          <div className="app-brand">
            <div className="app-logo-wrap" aria-hidden="true">
              <img src="/favicon.svg" alt="" className="app-logo" />
            </div>
            <div className="app-brand-copy">
              <span className="app-mark">Skills Lab</span>
              <AppVersionBadge />
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <section className="sidebar-section project-tree-section">
          <div className="sidebar-section-head">
            <span>Skills 话题</span>
            <div className="sidebar-section-actions">
              <IconButton
                icon={<FilePlus />}
                label="新建 Skill 话题"
                onClick={onCreateTopic}
              />
              <IconButton icon={<Plus />} label="新建话题" onClick={onCreateTopic} />
            </div>
          </div>
          {toastMessage && <div className="action-toast">{toastMessage}</div>}

          <div className="project-tree">
            {topics.length ? (
              topics.map((topic) => (
                <div
                  className={`topic-row skill-topic-row ${
                    topic.id === activeTopicId ? 'is-active' : ''
                  } ${topic.id === draggingTopicId ? 'is-dragging' : ''} ${
                    topic.id === dragOverTopicId && topic.id !== draggingTopicId
                      ? 'is-drag-over'
                      : ''
                  }`}
                  key={topic.id}
                  draggable
                  onDragStart={(event) => {
                    setDraggingTopicId(topic.id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/skill-topic-id', topic.id)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDragOverTopicId(topic.id)
                  }}
                  onDragLeave={() => {
                    setDragOverTopicId((id) => (id === topic.id ? undefined : id))
                  }}
                  onDragEnd={clearDragState}
                  onDrop={(event) => {
                    event.preventDefault()
                    const draggedId = event.dataTransfer.getData('text/skill-topic-id')
                    clearDragState()
                    if (!draggedId || draggedId === topic.id) return
                    void onReorderTopics(draggedId, topic.id).catch(
                      (error: unknown) => {
                        setToastMessage(
                          error instanceof Error ? error.message : '排序失败',
                        )
                      },
                    )
                  }}
                >
                  <button
                    type="button"
                    draggable={false}
                    title={topic.skillPath ? `${topic.title}\n${topic.skillPath}` : topic.title}
                    onClick={() => onSelectTopic(topic.id)}
                  >
                    <span className="skill-topic-main">
                      {topic.status === 'error' ? (
                        <CircleAlert />
                      ) : topic.status === 'analyzing' ? (
                        <RefreshCw />
                      ) : (
                        <Bot />
                      )}
                      <span>{topic.title}</span>
                    </span>
                  </button>
                  <SkillTopicActionsMenu
                    topic={topic}
                    onAnalyze={(targetTopic) =>
                      showActionResult(
                        () => onAnalyzeTopic(targetTopic),
                        '开始解读',
                      )
                    }
                    onCreateSkill={onCreateSkill}
                    onDuplicate={(targetTopic) =>
                      showActionResult(
                        () => onDuplicateTopic(targetTopic),
                        '复制副本成功',
                      )
                    }
                    onOpenFolder={onOpenFolder}
                    onRename={onRenameTopic}
                    onSelectSkill={onSelectSkill}
                    onUnbind={onUnbindSkill}
                  />
                  <IconButton
                    className="topic-delete-button"
                    icon={<Trash2 />}
                    label="删除话题"
                    onClick={() => onDeleteTopic(topic)}
                  />
                </div>
              ))
            ) : (
              <button type="button" className="topic-empty-row" onClick={onCreateTopic}>
                新建 Skills 话题
              </button>
            )}
          </div>
        </section>
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
