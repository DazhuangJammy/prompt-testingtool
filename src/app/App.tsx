import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
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
import {
  copyChatCompareOpen,
  getChatCompareModeStorageKey,
  normalizeChatCompareMode,
  setChatCompareOpen,
  type ChatCompareModeMap,
} from '@/features/chat/model/chatCompareMode'
import {
  copyChatPanelWidth,
  getChatPanelWidthStorageKey,
  normalizeChatPanelWidths,
  resolveChatPanelWidth,
  setChatPanelWidth,
  type ChatPanelWidthMap,
} from '@/features/chat/model/chatPanelWidth'
import { repairLegacyChatTopicScope } from '@/features/workspace/application/workspaceService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { CanvasWorkspace } from '@/features/canvas/CanvasWorkspace'
import { useScopedCanvasRecords } from '@/features/canvas/hooks/useScopedCanvasRecords'
import { copyStoredCanvasViewport } from '@/features/canvas/model/canvasViewport'
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
import { resolveActiveChatCard, resolveChatScopePromptCardId } from './activeChatCard'
import { resolveActiveChatSessionId, useActiveChatTopic } from './useActiveChatTopic'
import { useResizablePanels } from './useResizablePanels'
import { useResponsivePanels } from './useResponsivePanels'
import { useCanvasToolShortcutSettings } from './useCanvasToolShortcutSettings'
import { useThemeMode } from './useThemeMode'
import { useWorkspaceActions } from './useWorkspaceActions'
import { useWorkspaceData } from './useWorkspaceData'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [compareOpenBySession, setCompareOpenBySession] =
    useState<ChatCompareModeMap>(readStoredCompareMode)
  const [chatWidthBySession, setChatWidthBySession] =
    useState<ChatPanelWidthMap>(readStoredChatPanelWidths)
  const [activeChatTopic, setActiveChatTopic] = useActiveChatTopic()
  const [pendingActiveSession, setPendingActiveSession] = useState<
    { sessionId: string; sessionListKey: string } | undefined
  >()
  const panels = useResponsivePanels()
  const canvasToolShortcuts = useCanvasToolShortcutSettings()
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
  const sidebarChatSessions = useLiveQuery<ChatSession[], undefined>(
    () => chatRepository.listSessionsByUpdatedAt(),
    [],
    undefined,
  )
  const sidebarSessionsLoaded = sidebarChatSessions !== undefined
  const sessionCanvasByPromptCard = new Map(
    workspace.promptCards.map((card) => [card.id, card.canvasId]),
  )
  const sidebarSessions = (sidebarChatSessions ?? []).map((session) =>
    session.canvasId || !session.promptCardId
      ? session
      : {
          ...session,
          canvasId: sessionCanvasByPromptCard.get(session.promptCardId),
        },
  )
  const sidebarSessionListKey = sidebarSessions
    .map((session) => `${session.id}:${session.canvasId ?? ''}`)
    .join('|')

  const activeChatSessionId = resolveActiveChatSessionId({
    activeChatTopic,
    effectiveCanvasId: workspace.effectiveCanvasId,
    pendingSessionId:
      pendingActiveSession?.sessionListKey === sidebarSessionListKey
        ? pendingActiveSession.sessionId
        : undefined,
    sessions: sidebarSessions,
    sidebarSessionsLoaded,
  })
  const activeChatSession = sidebarSessions.find(
    (session) => session.id === activeChatSessionId,
  )
  const sessionPromptCard = activeChatSession?.promptCardId
    ? workspace.promptCards.find((card) => card.id === activeChatSession.promptCardId)
    : workspace.activeCard
  const activeChatPromptCardId = resolveChatScopePromptCardId({
    selectedCard: workspace.activeCard,
    session: activeChatSession,
  })
  const scopedChatRecords = useScopedCanvasRecords({
    canvasId: workspace.effectiveCanvasId,
    promptCardId: activeChatPromptCardId,
    promptCards: workspace.promptCards,
    sessionId: activeChatSessionId,
  })
  const chatPromptCards = useMemo(() => {
    if (scopedChatRecords.promptCards.length) return scopedChatRecords.promptCards
    return sessionPromptCard ? [sessionPromptCard] : []
  }, [sessionPromptCard, scopedChatRecords.promptCards])
  const activeChatCard = resolveActiveChatCard({
    chatPromptCards,
    selectedCard: workspace.activeCard,
    session: activeChatSession,
    sessionPromptCard,
  })
  const compareOpen = Boolean(
    activeChatSessionId && compareOpenBySession[activeChatSessionId],
  )
  const chatWidth = resolveChatPanelWidth(chatWidthBySession, activeChatSessionId)
  const setActiveChatPanelWidth = (value: number | ((current: number) => number)) => {
    setChatWidthBySession((current) => {
      const nextWidth =
        typeof value === 'function'
          ? value(resolveChatPanelWidth(current, activeChatSessionId))
          : value
      return setChatPanelWidth(current, activeChatSessionId, nextWidth)
    })
  }
  const resizablePanels = useResizablePanels(chatWidth, setActiveChatPanelWidth)

  useEffect(() => {
    void repairLegacyChatTopicScope(activeChatSessionId)
  }, [activeChatSessionId])

  useEffect(() => {
    if (!activeChatSession || !workspace.effectiveCanvasId) return
    if (
      activeChatTopic.canvasId === workspace.effectiveCanvasId &&
      activeChatTopic.sessionId === activeChatSession.id
    ) {
      return
    }
    setActiveChatTopic({
      canvasId: workspace.effectiveCanvasId,
      sessionId: activeChatSession.id,
    })
  }, [
    activeChatSession,
    activeChatTopic.canvasId,
    activeChatTopic.sessionId,
    setActiveChatTopic,
    workspace.effectiveCanvasId,
  ])

  useEffect(() => {
    writeStoredCompareMode(compareOpenBySession)
  }, [compareOpenBySession])

  useEffect(() => {
    writeStoredChatPanelWidths(chatWidthBySession)
  }, [chatWidthBySession])

  const setActiveChatSessionId = (sessionId?: string) => {
    setPendingActiveSession(
      sessionId ? { sessionId, sessionListKey: sidebarSessionListKey } : undefined,
    )
    setActiveChatTopic({
      canvasId: workspace.effectiveCanvasId,
      sessionId,
    })
  }

  const setActiveChatSessionForCanvas = (canvasId: string, sessionId?: string) => {
    setPendingActiveSession(
      sessionId ? { sessionId, sessionListKey: sidebarSessionListKey } : undefined,
    )
    setActiveChatTopic({ canvasId, sessionId })
  }

  const setActiveChatSessionCompareOpen = (open: boolean) => {
    setCompareOpenBySession((current) =>
      setChatCompareOpen(current, activeChatSessionId, open),
    )
  }

  const selectChatSession = (sessionId?: string) => {
    const session = sidebarSessions.find((item) => item.id === sessionId)
    const canvasId = session?.canvasId ?? workspace.effectiveCanvasId
    if (session?.promptCardId) {
      workspace.setSelectedCardId(session.promptCardId)
    }
    if (canvasId) setActiveChatSessionForCanvas(canvasId, sessionId)
    else setActiveChatSessionId(sessionId)
  }

  const createChatSession = async (canvasId = workspace.effectiveCanvasId) => {
    if (!canvasId) return
    const session = await createChatTopic(canvasId)
    const card = await actions.addPromptCard(undefined, session.id)
    const promptCardId = card?.id
    await actions.assignPromptCardToChatTopic(promptCardId, session.id)
    workspace.setActiveCanvasId(canvasId)
    if (promptCardId) {
      workspace.setSelectedCardId(promptCardId)
    }
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

  const duplicateChatSession = async (session: ChatSession) => {
    const siblingSessions = sidebarSessions.filter(
      (item) => item.canvasId === session.canvasId,
    )
    const copiedSession = await actions.duplicateChatTopic(session, siblingSessions)
    const canvasId = copiedSession.canvasId ?? workspace.effectiveCanvasId
    setCompareOpenBySession((current) =>
      copyChatCompareOpen(current, session.id, copiedSession.id),
    )
    setChatWidthBySession((current) =>
      copyChatPanelWidth(current, session.id, copiedSession.id, chatWidth),
    )
    if (canvasId) {
      copyStoredCanvasViewport({
        sourceCanvasId: session.canvasId ?? workspace.effectiveCanvasId,
        sourceSessionId: session.id,
        targetCanvasId: canvasId,
        targetSessionId: copiedSession.id,
      })
      workspace.setActiveCanvasId(canvasId)
      if (copiedSession.promptCardId) {
        workspace.setSelectedCardId(copiedSession.promptCardId)
      }
      setActiveChatSessionForCanvas(canvasId, copiedSession.id)
    } else {
      setActiveChatSessionId(copiedSession.id)
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
          onDuplicateSession={duplicateChatSession}
          onDelete={actions.deleteCanvas}
          onDeleteSession={deleteChatSession}
          onExportSession={exportChatSession}
          onExport={actions.exportChatTopic}
          onImport={async (file, targetCanvasId) => {
            const result = await actions.importChatTopic(file, targetCanvasId)
            setActiveChatSessionForCanvas(result.canvasId, result.sessionId)
            if (result.promptCardId) {
              workspace.setSelectedCardId(result.promptCardId)
            }
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
            activeSessionId={activeChatSessionId}
            activeSessionPromptCardId={activeChatPromptCardId}
            promptOptimizationProvider={workspace.defaultProvider}
            promptOptimizationSettings={workspace.defaultModelSettings}
            toolShortcuts={canvasToolShortcuts.shortcuts}
            promptCards={workspace.promptCards}
            onAddPrompt={actions.addPromptCard}
            onDeleteCard={actions.deletePromptCard}
            onSelectCard={workspace.setSelectedCardId}
          />
        </main>

        <ChatPanel
          card={activeChatCard}
          provider={workspace.activeProvider}
          promptCards={chatPromptCards}
          providers={workspace.providers}
          compareOpen={compareOpen}
          collapsed={panels.chatCollapsed}
          onResizeStart={resizablePanels.startChatResize}
          activeSessionId={activeChatSessionId}
          onToggle={panels.toggleChat}
          onSelectProvider={workspace.setActiveProviderId}
          onActiveSessionChange={setActiveChatSessionId}
          onActiveCardChange={workspace.setSelectedCardId}
          onCompareOpenChange={setActiveChatSessionCompareOpen}
          onEnsureWidth={resizablePanels.ensureChatWidth}
          width={chatWidth}
        />

        <SettingsDialog
          open={settingsOpen}
          defaultModelSettings={workspace.defaultModelSettings}
          canvasToolShortcuts={canvasToolShortcuts.shortcuts}
          providers={workspace.providerConfigs}
          activeProviderId={workspace.effectiveProviderConfigId}
          onClose={() => setSettingsOpen(false)}
          onResetCanvasToolShortcuts={canvasToolShortcuts.resetShortcuts}
          onSelect={() => undefined}
          onSaveCanvasToolShortcut={canvasToolShortcuts.setShortcut}
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

function readStoredCompareMode() {
  try {
    return normalizeChatCompareMode(
      JSON.parse(localStorage.getItem(getChatCompareModeStorageKey()) ?? '{}'),
    )
  } catch {
    return {}
  }
}

function writeStoredCompareMode(compareOpenBySession: ChatCompareModeMap) {
  try {
    localStorage.setItem(
      getChatCompareModeStorageKey(),
      JSON.stringify(compareOpenBySession),
    )
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function readStoredChatPanelWidths() {
  try {
    return normalizeChatPanelWidths(
      JSON.parse(localStorage.getItem(getChatPanelWidthStorageKey()) ?? '{}'),
    )
  } catch {
    return {}
  }
}

function writeStoredChatPanelWidths(chatWidthBySession: ChatPanelWidthMap) {
  try {
    localStorage.setItem(
      getChatPanelWidthStorageKey(),
      JSON.stringify(chatWidthBySession),
    )
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export default App
