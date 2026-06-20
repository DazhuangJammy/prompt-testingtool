import {
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  Moon,
  PanelsTopLeft,
  MoreHorizontal,
  Pencil,
  FileInput,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { IconButton } from '@/shared/ui/IconButton'
import type { Canvas, ChatSession, ThemeMode } from '@/shared/types'
import { AppVersionBadge } from './components/AppVersionBadge'
import { TopicActionsMenu } from './components/TopicActionsMenu'
import { TopicImportDialog } from './components/TopicImportDialog'
import type { ChatSessionExportAction } from './sidebar.types'

interface SidebarProps {
  canvases: Canvas[]
  activeCanvasId?: string
  activeSessionId?: string
  collapsed: boolean
  theme: ThemeMode
  onToggle: () => void
  onToggleTheme: () => void
  onSelect: (id: string) => void
  onSelectSession: (id?: string) => void
  sessions: ChatSession[]
  onCreate: () => void
  onCreateSession: (canvasId?: string) => void
  onRename: (id: string, title: string) => void
  onRenameSession: (session: ChatSession) => void
  onReorderSessions: (
    canvasId: string,
    draggedId: string,
    targetId: string,
  ) => Promise<void>
  onDuplicateSession: (session: ChatSession) => Promise<void>
  onDelete: (id: string) => void
  onDeleteSession: (session: ChatSession) => void
  onExportSession: (
    session: ChatSession,
    action: ChatSessionExportAction,
  ) => Promise<void>
  onExport: (sessionId?: string) => Promise<void>
  onImport: (file: File, targetCanvasId?: string) => Promise<void>
  onOpenSettings: () => void
  onResizeStart: (event: React.PointerEvent) => void
  width: number
}

export function Sidebar({
  canvases,
  activeCanvasId,
  activeSessionId,
  collapsed,
  theme,
  onToggle,
  onToggleTheme,
  onSelect,
  onSelectSession,
  sessions,
  onCreate,
  onCreateSession,
  onRename,
  onRenameSession,
  onReorderSessions,
  onDuplicateSession,
  onDelete,
  onDeleteSession,
  onExportSession,
  onExport,
  onImport,
  onOpenSettings,
  onResizeStart,
  width,
}: SidebarProps) {
  const effectiveSessionId = sessions.some((session) => session.id === activeSessionId)
    ? activeSessionId
    : undefined
  const [collapsedCanvasIds, setCollapsedCanvasIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [menuCanvasId, setMenuCanvasId] = useState<string>()
  const [draggingSessionId, setDraggingSessionId] = useState<string>()
  const [dragOverSessionId, setDragOverSessionId] = useState<string>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(''), 1400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (!menuCanvasId) return

    const close = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.project-menu-wrap')
      ) {
        return
      }
      setMenuCanvasId(undefined)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuCanvasId(undefined)
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuCanvasId])

  const handleExport = async () => {
    try {
      await onExport(effectiveSessionId)
      setToastMessage('导出成功')
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : '导出失败')
    }
  }

  const toggleCanvas = (canvasId: string) => {
    setCollapsedCanvasIds((current) => {
      const next = new Set(current)
      if (next.has(canvasId)) next.delete(canvasId)
      else next.add(canvasId)
      return next
    })
  }

  const selectAndToggleCanvas = (canvasId: string) => {
    onSelect(canvasId)
    toggleCanvas(canvasId)
  }

  const renameCanvas = (canvas: Canvas) => {
    const next = prompt('重命名工作台', canvas.title)
    if (next) onRename(canvas.id, next)
    setMenuCanvasId(undefined)
  }

  const clearTopicDragState = () => {
    setDraggingSessionId(undefined)
    setDragOverSessionId(undefined)
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}
      style={{ '--panel-width': `${width}px` } as CSSProperties}
    >
      <nav className="rail-nav" aria-label="功能区">
        <IconButton icon={<PanelsTopLeft />} label="工作台" active />
        <IconButton icon={<Bot />} label="智能体" disabled />
        <IconButton
          className="rail-theme"
          icon={theme === 'dark' ? <Sun /> : <Moon />}
          label="主题"
          onClick={onToggleTheme}
        />
        <IconButton
          className="rail-settings"
          icon={<Settings />}
          label="设置"
          onClick={onOpenSettings}
        />
        <IconButton
          className="rail-toggle"
          icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          label={collapsed ? '展开' : '收起'}
          onClick={onToggle}
        />
      </nav>
      <div className="sidebar-head">
        {!collapsed && (
          <div className="app-brand">
            <div className="app-logo-wrap" aria-hidden="true">
              <img src="/favicon.svg" alt="" className="app-logo" />
            </div>
            <div className="app-brand-copy">
              <span className="app-mark">Prompt Canvas</span>
              <AppVersionBadge />
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <section className="sidebar-section project-tree-section">
            <div className="sidebar-section-head">
              <span>工作台</span>
              <div className="sidebar-section-actions">
                <IconButton
                  icon={<FileInput />}
                  label="导入话题"
                  onClick={() => setImportDialogOpen(true)}
                />
                <IconButton
                  icon={<Download />}
                  label="导出话题"
                  disabled={!effectiveSessionId}
                  onClick={() => void handleExport()}
                />
                <IconButton icon={<Plus />} label="新建工作台" onClick={onCreate} />
              </div>
            </div>
            {toastMessage && <div className="action-toast">{toastMessage}</div>}

            <div className="project-tree">
              {canvases.map((canvas) => {
                const canvasSessions = sessions.filter(
                  (session) => session.canvasId === canvas.id,
                )
                const isCollapsed = collapsedCanvasIds.has(canvas.id)
                const active = canvas.id === activeCanvasId
                const hasActiveSession = canvasSessions.some(
                  (session) => session.id === effectiveSessionId,
                )

                return (
                  <div className="project-group" key={canvas.id}>
                    <div
                      className={`project-row ${
                        active && !hasActiveSession ? 'is-active' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="project-main"
                        onClick={() => selectAndToggleCanvas(canvas.id)}
                        title={canvas.title}
                      >
                        {isCollapsed ? <Folder /> : <FolderOpen />}
                        <span className="project-title">{canvas.title}</span>
                        <span className="project-chevron" aria-hidden="true">
                          {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                        </span>
                      </button>
                      <div className="project-row-actions">
                        <div className="project-menu-wrap">
                          <IconButton
                            icon={<MoreHorizontal />}
                            label="工作台操作"
                            active={menuCanvasId === canvas.id}
                            onClick={() =>
                              setMenuCanvasId((id) =>
                                id === canvas.id ? undefined : canvas.id,
                              )
                            }
                          />
                          {menuCanvasId === canvas.id && (
                            <div className="project-menu">
                              <button type="button" onClick={() => renameCanvas(canvas)}>
                                <Pencil />
                                <span>重命名工作台</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuCanvasId(undefined)
                                  onDelete(canvas.id)
                                }}
                              >
                                <Trash2 />
                                <span>删除工作台</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <IconButton
                          icon={<Plus />}
                          label="新建话题"
                          onClick={() => onCreateSession(canvas.id)}
                        />
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="project-topic-list">
                        {canvasSessions.length ? (
                          canvasSessions.map((session) => (
                            <div
                              className={`topic-row ${
                                session.id === effectiveSessionId ? 'is-active' : ''
                              } ${
                                session.id === draggingSessionId
                                  ? 'is-dragging'
                                  : ''
                              } ${
                                session.id === dragOverSessionId &&
                                session.id !== draggingSessionId
                                  ? 'is-drag-over'
                                  : ''
                              }`}
                              key={session.id}
                              draggable
                              onDragStart={(event) => {
                                setDraggingSessionId(session.id)
                                event.dataTransfer.effectAllowed = 'move'
                                event.dataTransfer.setData(
                                  'text/chat-session-id',
                                  session.id,
                                )
                              }}
                              onDragOver={(event) => {
                                event.preventDefault()
                                event.dataTransfer.dropEffect = 'move'
                                setDragOverSessionId(session.id)
                              }}
                              onDragLeave={() => {
                                setDragOverSessionId((id) =>
                                  id === session.id ? undefined : id,
                                )
                              }}
                              onDragEnd={clearTopicDragState}
                              onDrop={(event) => {
                                event.preventDefault()
                                const draggedId = event.dataTransfer.getData(
                                  'text/chat-session-id',
                                )
                                clearTopicDragState()
                                if (!draggedId || draggedId === session.id) return
                                void onReorderSessions(
                                  canvas.id,
                                  draggedId,
                                  session.id,
                                ).catch((error: unknown) => {
                                  setToastMessage(
                                    error instanceof Error
                                      ? error.message
                                      : '排序失败',
                                  )
                                })
                              }}
                            >
                              <button
                                type="button"
                                draggable={false}
                                title={session.title}
                                onClick={() => {
                                  onSelect(canvas.id)
                                  onSelectSession(session.id)
                                }}
                              >
                                {session.title}
                              </button>
                              <TopicActionsMenu
                                session={session}
                                onRename={onRenameSession}
                                onDuplicate={(targetSession) => {
                                  void onDuplicateSession(targetSession)
                                    .then(() => setToastMessage('复制副本成功'))
                                    .catch((error: unknown) => {
                                      setToastMessage(
                                        error instanceof Error
                                          ? error.message
                                          : '复制副本失败',
                                      )
                                    })
                                }}
                                onExport={(targetSession, action) => {
                                  void onExportSession(targetSession, action)
                                    .then(() => {
                                      setToastMessage(
                                        action.startsWith('copy')
                                          ? '复制成功'
                                          : '导出成功',
                                      )
                                    })
                                    .catch((error: unknown) => {
                                      setToastMessage(
                                        error instanceof Error
                                          ? error.message
                                          : '导出失败',
                                      )
                                    })
                                }}
                              />
                              <IconButton
                                className="topic-delete-button"
                                icon={<Trash2 />}
                                label="删除话题"
                                onClick={() => onDeleteSession(session)}
                              />
                            </div>
                          ))
                        ) : (
                          <button
                            type="button"
                            className="topic-empty-row"
                            onClick={() => onCreateSession(canvas.id)}
                          >
                            新建话题
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
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
      {importDialogOpen && (
        <TopicImportDialog
          activeCanvasId={activeCanvasId}
          canvases={canvases}
          onClose={() => setImportDialogOpen(false)}
          onImport={async (file, targetCanvasId) => {
            await onImport(file, targetCanvasId)
            setToastMessage('导入成功')
          }}
        />
      )}
    </aside>
  )
}
