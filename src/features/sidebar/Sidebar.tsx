import {
  ChevronDown,
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  FileInput,
  Plus,
  Trash2,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { IconButton } from '@/shared/ui/IconButton'
import type { Canvas, ChatSession, ThemeMode, WorkspaceMode } from '@/shared/types'
import { AppVersionBadge } from './components/AppVersionBadge'
import { ProjectActionsMenu } from './components/ProjectActionsMenu'
import { TopicActionsMenu } from './components/TopicActionsMenu'
import { TopicImportDialog } from './components/TopicImportDialog'
import { WorkspaceRailNav } from './components/WorkspaceRailNav'
import { usePersistentCollapsedCanvasIds } from './hooks/usePersistentCollapsedCanvasIds'
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
  onReorderCanvases: (draggedId: string, targetId: string) => Promise<void>
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
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
  contentHidden?: boolean
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
  onReorderCanvases,
  onDuplicateSession,
  onDelete,
  onDeleteSession,
  onExportSession,
  onExport,
  onImport,
  onOpenSettings,
  onResizeStart,
  width,
  mode,
  onModeChange,
  contentHidden = false,
}: SidebarProps) {
  const effectiveSessionId = sessions.some((session) => session.id === activeSessionId)
    ? activeSessionId
    : undefined
  const { collapsedCanvasIds, toggleCanvas } = usePersistentCollapsedCanvasIds()
  const [draggingCanvasId, setDraggingCanvasId] = useState<string>()
  const [dragOverCanvasId, setDragOverCanvasId] = useState<string>()
  const [draggingSessionId, setDraggingSessionId] = useState<string>()
  const [dragOverSessionId, setDragOverSessionId] = useState<string>()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(''), 1400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const handleExport = async () => {
    try {
      await onExport(effectiveSessionId)
      setToastMessage('导出成功')
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : '导出失败')
    }
  }

  const selectAndToggleCanvas = (canvasId: string) => {
    onSelect(canvasId)
    toggleCanvas(canvasId)
  }

  const renameCanvas = (canvas: Canvas) => {
    const next = prompt('重命名工作台', canvas.title)
    if (next) onRename(canvas.id, next)
  }

  const clearTopicDragState = () => {
    setDraggingSessionId(undefined)
    setDragOverSessionId(undefined)
  }

  const clearCanvasDragState = () => {
    setDraggingCanvasId(undefined)
    setDragOverCanvasId(undefined)
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${contentHidden ? 'is-rail-only' : ''}`}
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
      {!contentHidden && <div className="sidebar-head">
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
      </div>}

      {!contentHidden && !collapsed && (
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
                      } ${canvas.id === draggingCanvasId ? 'is-dragging' : ''} ${
                        canvas.id === dragOverCanvasId &&
                        canvas.id !== draggingCanvasId
                          ? 'is-drag-over'
                          : ''
                      }`}
                      draggable
                      onDragStart={(event) => {
                        setDraggingCanvasId(canvas.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/canvas-id', canvas.id)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        setDragOverCanvasId(canvas.id)
                      }}
                      onDragLeave={() => {
                        setDragOverCanvasId((id) =>
                          id === canvas.id ? undefined : id,
                        )
                      }}
                      onDragEnd={clearCanvasDragState}
                      onDrop={(event) => {
                        event.preventDefault()
                        const draggedId = event.dataTransfer.getData('text/canvas-id')
                        clearCanvasDragState()
                        if (!draggedId || draggedId === canvas.id) return
                        void onReorderCanvases(draggedId, canvas.id).catch(
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
                        <ProjectActionsMenu
                          canvas={canvas}
                          onDelete={(targetCanvas) => onDelete(targetCanvas.id)}
                          onRename={renameCanvas}
                        />
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
      {!contentHidden && !collapsed && (
        <button
          type="button"
          className="panel-resizer is-right"
          aria-label="调整宽度"
          onPointerDown={onResizeStart}
        />
      )}
      {!contentHidden && importDialogOpen && (
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
