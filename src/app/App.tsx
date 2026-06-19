import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import '@/styles/app.css'
import { ChatPanel } from '@/features/chat/ChatPanel'
import {
  copyChatSessionImage,
  copyChatSessionText,
  downloadChatSessionImage,
  downloadChatSessionMarkdown,
  downloadChatSessionWord,
} from '@/features/chat/application/messageExportService'
import {
  createChatTopic,
  deleteChatTopicAndPickNext,
  renameChatTopic,
} from '@/features/chat/application/chatService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { CanvasWorkspace } from '@/features/canvas/CanvasWorkspace'
import { WorkspaceTopbar } from '@/features/canvas/WorkspaceTopbar'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { Sidebar } from '@/features/sidebar/Sidebar'
import type { ChatSessionExportAction } from '@/features/sidebar/sidebar.types'
import { defaultModelSettingsRepository } from '@/features/settings/infrastructure/defaultModelSettingsRepository'
import { providerRepository } from '@/features/settings/infrastructure/providerRepository'
import {
  buildSelectableProviderId,
  normalizeProviderConfig,
} from '@/features/settings/model/providerCatalog'
import type { ChatSession } from '@/shared/types'
import { useResizablePanels } from './useResizablePanels'
import { useResponsivePanels } from './useResponsivePanels'
import { useThemeMode } from './useThemeMode'
import { useWorkspaceActions } from './useWorkspaceActions'
import { useWorkspaceData } from './useWorkspaceData'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeChatTopic, setActiveChatTopic] = useState<{
    canvasId?: string
    sessionId?: string
  }>({})
  const panels = useResponsivePanels()
  const resizablePanels = useResizablePanels()
  const { theme, toggleTheme } = useThemeMode()
  const workspace = useWorkspaceData()
  const actions = useWorkspaceActions({
    canvases: workspace.canvases,
    effectiveCanvasId: workspace.effectiveCanvasId,
    promptCards: workspace.promptCards,
    selectedCardId: workspace.effectiveSelectedCardId,
    setActiveCanvasId: workspace.setActiveCanvasId,
    setSelectedCardId: workspace.setSelectedCardId,
  })
  const sidebarChatSessions = useLiveQuery(
    () => chatRepository.listSessionsByUpdatedAt(),
    [],
    [],
  )
  const sessionCanvasByPromptCard = new Map(
    workspace.promptCards.map((card) => [card.id, card.canvasId]),
  )
  const sidebarSessions = sidebarChatSessions.map((session) =>
    session.canvasId || !session.promptCardId
      ? session
      : {
          ...session,
          canvasId: sessionCanvasByPromptCard.get(session.promptCardId),
        },
  )

  const activeChatSessionId =
    activeChatTopic.canvasId === workspace.effectiveCanvasId
      ? activeChatTopic.sessionId
      : undefined

  const setActiveChatSessionId = (sessionId?: string) => {
    setActiveChatTopic({
      canvasId: workspace.effectiveCanvasId,
      sessionId,
    })
  }

  const setActiveChatSessionForCanvas = (canvasId: string, sessionId?: string) => {
    setActiveChatTopic({ canvasId, sessionId })
  }

  const selectChatSession = (sessionId?: string) => {
    const session = sidebarSessions.find((item) => item.id === sessionId)
    const canvasId = session?.canvasId ?? workspace.effectiveCanvasId
    if (canvasId) setActiveChatSessionForCanvas(canvasId, sessionId)
    else setActiveChatSessionId(sessionId)
  }

  const createChatSession = async (canvasId = workspace.effectiveCanvasId) => {
    if (!canvasId) return
    const promptCardId =
      canvasId === workspace.activeCard?.canvasId ? workspace.activeCard.id : undefined
    const session = await createChatTopic(canvasId, undefined, promptCardId)
    workspace.setActiveCanvasId(canvasId)
    setActiveChatSessionForCanvas(canvasId, session.id)
  }

  const renameChatSession = async (session: ChatSession) => {
    const next = prompt('重命名话题', session.title)
    if (!next) return
    await renameChatTopic(session.id, next)
  }

  const deleteChatSession = async (session: ChatSession) => {
    if (!confirm(`删除话题「${session.title}」？`)) return
    const siblingSessions = sidebarSessions.filter(
      (item) => item.canvasId === session.canvasId,
    )
    const nextSessionId = await deleteChatTopicAndPickNext({
      activeSessionId: activeChatSessionId,
      sessions: siblingSessions,
      sessionId: session.id,
    })
    if (activeChatSessionId === session.id) {
      if (session.canvasId) setActiveChatSessionForCanvas(session.canvasId, nextSessionId)
      else setActiveChatSessionId(nextSessionId)
    }
  }

  const exportChatSession = async (
    session: ChatSession,
    action: ChatSessionExportAction,
  ) => {
    const messages = await chatRepository.listMessagesBySession(session.id)
    if (action === 'copy-text') return copyChatSessionText(session, messages)
    if (action === 'copy-image') return copyChatSessionImage(session, messages)
    if (action === 'download-image') return downloadChatSessionImage(session, messages)
    if (action === 'download-markdown') {
      return downloadChatSessionMarkdown(session, messages, false)
    }
    if (action === 'download-markdown-with-thinking') {
      return downloadChatSessionMarkdown(session, messages, true)
    }
    return downloadChatSessionWord(session, messages)
  }

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <Sidebar
          canvases={workspace.canvases}
          activeCanvasId={workspace.effectiveCanvasId}
          activeSessionId={activeChatSessionId}
          collapsed={panels.sidebarCollapsed}
          theme={theme}
          sessions={sidebarSessions}
          onToggle={panels.toggleSidebar}
          onToggleTheme={toggleTheme}
          onSelect={workspace.setActiveCanvasId}
          onSelectSession={selectChatSession}
          onCreate={actions.createNextCanvas}
          onCreateSession={createChatSession}
          onRename={(id, title) => actions.updateCanvas(id, { title })}
          onRenameSession={renameChatSession}
          onDelete={actions.deleteCanvas}
          onDeleteSession={deleteChatSession}
          onExportSession={exportChatSession}
          onExport={actions.exportChatTopic}
          onImport={async (file, targetCanvasId) => {
            const result = await actions.importChatTopic(file, targetCanvasId)
            setActiveChatSessionForCanvas(result.canvasId, result.sessionId)
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onResizeStart={resizablePanels.startSidebarResize}
          width={resizablePanels.sidebarWidth}
        />

        <main className="workspace">
          <WorkspaceTopbar
            title={workspace.activeCanvas?.title ?? '工作台'}
          />

        <CanvasWorkspace
          effectiveCanvasId={workspace.effectiveCanvasId}
          promptOptimizationProvider={workspace.defaultProvider}
          promptOptimizationSettings={workspace.defaultModelSettings}
          promptCards={workspace.promptCards}
          onAddPrompt={actions.addPromptCard}
            onDeleteCard={actions.deletePromptCard}
            onSelectCard={workspace.setSelectedCardId}
          />
        </main>

        <ChatPanel
          card={workspace.activeCard}
          provider={workspace.activeProvider}
          promptCards={workspace.promptCards}
          providers={workspace.providers}
          collapsed={panels.chatCollapsed}
          onResizeStart={resizablePanels.startChatResize}
          activeSessionId={activeChatSessionId}
          onToggle={panels.toggleChat}
          onSelectProvider={workspace.setActiveProviderId}
          onActiveSessionChange={setActiveChatSessionId}
          onActiveCardChange={workspace.setSelectedCardId}
          onEnsureWidth={resizablePanels.ensureChatWidth}
          width={resizablePanels.chatWidth}
        />

        <SettingsDialog
          open={settingsOpen}
          defaultModelSettings={workspace.defaultModelSettings}
          providers={workspace.providerConfigs}
          activeProviderId={workspace.effectiveProviderConfigId}
          onClose={() => setSettingsOpen(false)}
          onSelect={() => undefined}
          onSaveDefaultModelSettings={async (settings) => {
            await defaultModelSettingsRepository.save(settings)
          }}
          onReorderProviders={async (providers) => {
            await Promise.all(providers.map((provider) => providerRepository.save(provider)))
          }}
          onDelete={async (id) => {
            await providerRepository.delete(id)
            if (workspace.activeProvider?.sourceProviderId === id) {
              workspace.setActiveProviderId(undefined)
            }
          }}
          onSave={async (provider) => {
            const normalized = normalizeProviderConfig(provider)
            await providerRepository.save(normalized)
            if (normalized.enabled && normalized.model) {
              workspace.setActiveProviderId(
                buildSelectableProviderId(normalized.id, normalized.model),
              )
            }
          }}
        />
      </div>
    </ReactFlowProvider>
  )
}

export default App
