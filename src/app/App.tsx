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
  reorderChatTopics,
} from '@/features/chat/application/chatService'
import { repairLegacyChatTopicScope } from '@/features/workspace/application/workspaceService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { CanvasWorkspace } from '@/features/canvas/CanvasWorkspace'
import { useScopedCanvasRecords } from '@/features/canvas/hooks/useScopedCanvasRecords'
import { findPromptInputSources } from '@/features/input-card/model/inputCard'
import { copyStoredCanvasViewport } from '@/features/canvas/model/canvasViewport'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import { WorkspaceTopbar } from '@/features/canvas/WorkspaceTopbar'
import { Sidebar } from '@/features/sidebar/Sidebar'
import { SkillsLabShell } from '@/features/skills-lab/SkillsLabShell'
import {
  bindSkillPath,
  createSkillForTopic,
  analyzeSkillTopic,
} from '@/features/skills-lab/application/skillsLabService'
import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import { useSkillsLabData } from '@/features/skills-lab/hooks/useSkillsLabData'
import type { ChatSessionExportAction } from '@/features/sidebar/sidebar.types'
import type { ChatSession } from '@/shared/types'
import { AppOverlays } from './AppOverlays'
import { resolveActiveChatCard, resolveChatScopePromptCardId } from './activeChatCard'
import { useChatPanelSessionState } from './useChatPanelSessionState'
import { resolveSidebarSessions } from './sidebarSessions'
import { resolveActiveChatSessionId, useActiveChatTopic } from './useActiveChatTopic'
import { useResizablePanels } from './useResizablePanels'
import { useResponsivePanels } from './useResponsivePanels'
import { useCanvasToolShortcutSettings } from './useCanvasToolShortcutSettings'
import { useSelectionMagnifierSettings } from './useSelectionMagnifierSettings'
import { useThemeMode } from './useThemeMode'
import { useWorkspaceMode } from './useWorkspaceMode'
import { useWorkspaceActions } from './useWorkspaceActions'
import { useWorkspaceData } from './useWorkspaceData'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useWorkspaceMode()
  const [skillPathDialogTopicId, setSkillPathDialogTopicId] = useState<string>()
  const [createSkillDialogTopicId, setCreateSkillDialogTopicId] = useState<string>()
  const [skillsBusy, setSkillsBusy] = useState(false)
  const [activeChatTopic, setActiveChatTopic] = useActiveChatTopic()
  const [pendingActiveSession, setPendingActiveSession] = useState<
    { sessionId: string; sessionListKey: string } | undefined
  >()
  const panels = useResponsivePanels()
  const canvasToolShortcuts = useCanvasToolShortcutSettings()
  const selectionMagnifier = useSelectionMagnifierSettings()
  const { theme, toggleTheme } = useThemeMode()
  const workspace = useWorkspaceData()
  const skillsLab = useSkillsLabData()
  const actions = useWorkspaceActions({
    canvases: workspace.canvases,
    effectiveCanvasId: workspace.effectiveCanvasId,
    inputCards: workspace.inputCards,
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
  const sidebarPromptCards = useLiveQuery(
    () => workspaceRepository.listPromptCards(),
    [],
    undefined,
  )
  const sidebarSessionsLoaded = sidebarChatSessions !== undefined
  const sidebarSessions = resolveSidebarSessions({
    fallbackPromptCards: workspace.promptCards,
    promptCards: sidebarPromptCards,
    sessions: sidebarChatSessions ?? [],
  })
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
    sessionCreatedAt: activeChatSession?.createdAt,
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
  const activeChatInputSources = useMemo(
    () =>
      findPromptInputSources({
        edges: scopedChatRecords.canvasEdges,
        inputCards: scopedChatRecords.inputCards,
        promptCard: activeChatCard,
      }),
    [
      activeChatCard,
      scopedChatRecords.canvasEdges,
      scopedChatRecords.inputCards,
    ],
  )
  const chatPanelState = useChatPanelSessionState(
    activeChatSessionId,
    panels.chatCollapsed,
  )
  const resizablePanels = useResizablePanels(
    chatPanelState.chatWidth,
    chatPanelState.setChatWidth,
  )

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
    workspace.setActiveCanvasId(canvasId)
    workspace.setSelectedCardId(undefined)
    setActiveChatSessionForCanvas(canvasId, session.id)
  }

  const renameChatSession = async (session: ChatSession) => {
    const next = prompt('重命名话题', session.title)
    if (!next) return
    await renameChatTopic(session.id, next)
  }

  const reorderChatSessions = async (
    canvasId: string,
    draggedId: string,
    targetId: string,
  ) => {
    const canvasSessions = sidebarSessions.filter(
      (session) => session.canvasId === canvasId,
    )
    await reorderChatTopics(canvasSessions, draggedId, targetId)
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
    const sourceComparePaneCardIds = chatPanelState.getComparePaneCardIds(
      session.id,
      activeChatCard,
      chatPromptCards,
    )
    const copiedSession = await actions.duplicateChatTopic(
      session,
      siblingSessions,
      sourceComparePaneCardIds,
    )
    const canvasId = copiedSession.canvasId ?? workspace.effectiveCanvasId
    chatPanelState.copySessionState(
      session.id,
      copiedSession.id,
      chatPanelState.chatWidth,
      copiedSession.promptCardIdMap,
      sourceComparePaneCardIds,
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

  const selectedSkillPathTopic = skillsLab.topics.find(
    (topic) => topic.id === skillPathDialogTopicId,
  )
  const selectedCreateSkillTopic = skillsLab.topics.find(
    (topic) => topic.id === createSkillDialogTopicId,
  )

  const bindSkillToTopic = async (topicId: string, skillPath: string) => {
    await bindSkillPath(topicId, skillPath)
    const topic = await skillsLabRepository.getTopic(topicId)
    if (topic && skillsLab.settings) {
      setSkillsBusy(true)
      analyzeSkillTopic(topic, skillsLab.settings)
        .finally(() => setSkillsBusy(false))
    }
  }

  const createSkillForActiveTopic = (promptText: string) => {
    if (!selectedCreateSkillTopic || !skillsLab.settings || skillsBusy) return
    setSkillsBusy(true)
    void createSkillForTopic(
      selectedCreateSkillTopic,
      skillsLab.settings,
      promptText,
    )
      .then(async () => {
        setCreateSkillDialogTopicId(undefined)
        const topic = await skillsLabRepository.getTopic(selectedCreateSkillTopic.id)
        if (topic && skillsLab.settings) {
          await analyzeSkillTopic(topic, skillsLab.settings)
        }
      })
      .finally(() => setSkillsBusy(false))
  }

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        {workspaceMode === 'prompt' ? (
          <Sidebar
            canvases={workspace.canvases}
            activeCanvasId={workspace.effectiveCanvasId}
            activeSessionId={activeChatSessionId}
            collapsed={panels.sidebarCollapsed}
            theme={theme}
            sessions={sidebarSessions}
            mode={workspaceMode}
            onModeChange={setWorkspaceMode}
            onToggle={panels.toggleSidebar}
            onToggleTheme={toggleTheme}
            onSelect={workspace.setActiveCanvasId}
            onSelectSession={selectChatSession}
            onCreate={actions.createNextCanvas}
            onCreateSession={createChatSession}
            onRename={(id, title) => actions.updateCanvas(id, { title })}
            onRenameSession={renameChatSession}
            onReorderSessions={reorderChatSessions}
            onReorderCanvases={actions.reorderCanvases}
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
        ) : (
          <SkillsLabShell
            activeTopic={skillsLab.activeTopic}
            activeTopicId={skillsLab.activeTopicId}
            busy={skillsBusy}
            chatCollapsed={chatPanelState.chatCollapsed}
            chatWidth={chatPanelState.chatWidth}
            messages={skillsLab.messages}
            mode={workspaceMode}
            settings={skillsLab.settings}
            sidebarCollapsed={panels.sidebarCollapsed}
            sidebarWidth={resizablePanels.sidebarWidth}
            theme={theme}
            topics={skillsLab.topics}
            onBusyChange={setSkillsBusy}
            onCreateSkillDialog={setCreateSkillDialogTopicId}
            onModeChange={setWorkspaceMode}
            onOpenSettings={() => setSettingsOpen(true)}
            onPathDialog={setSkillPathDialogTopicId}
            onResizeChat={resizablePanels.startChatResize}
            onResizeSidebar={resizablePanels.startSidebarResize}
            onSelectTopic={skillsLab.setActiveTopicId}
            onToggleChat={() =>
              chatPanelState.setChatCollapsed(!chatPanelState.chatCollapsed)
            }
            onToggleSidebar={panels.toggleSidebar}
            onToggleTheme={toggleTheme}
          />
        )}

        {workspaceMode === 'prompt' && (
          <main className="workspace">
            <WorkspaceTopbar title={workspace.activeCanvas?.title ?? '工作台'} />

            <CanvasWorkspace
              effectiveCanvasId={workspace.effectiveCanvasId}
              activeSessionId={activeChatSessionId}
              activeSessionCreatedAt={activeChatSession?.createdAt}
              activeSessionPromptCardId={activeChatPromptCardId}
              flowchartProvider={workspace.flowchartProvider}
              flowchartSettings={workspace.flowchartModelSettings}
              promptOptimizationProvider={workspace.defaultProvider}
              promptOptimizationSettings={workspace.defaultModelSettings}
              toolShortcuts={canvasToolShortcuts.shortcuts}
              promptCards={workspace.promptCards}
              onAddInputCard={actions.addInputCard}
              onAddPrompt={actions.addPromptCard}
              onDeleteCard={actions.deletePromptCard}
              onDeleteInputCard={actions.deleteInputCard}
              onSelectCard={workspace.setSelectedCardId}
            />
          </main>
        )}

        {workspaceMode === 'prompt' && (
          <ChatPanel
            card={activeChatCard}
            provider={workspace.activeProvider}
            promptCards={chatPromptCards}
            providers={workspace.providers}
            inputSources={activeChatInputSources}
            compareOpen={chatPanelState.compareOpen}
            comparePaneCardIds={chatPanelState.comparePaneCardIds}
            comparePanes={chatPanelState.comparePanes}
            collapsed={chatPanelState.chatCollapsed}
            onResizeStart={resizablePanels.startChatResize}
            activeSessionId={activeChatSessionId}
            onToggle={() =>
              chatPanelState.setChatCollapsed(!chatPanelState.chatCollapsed)
            }
            onSelectProvider={workspace.setActiveProviderId}
            onActiveSessionChange={setActiveChatSessionId}
            onActiveCardChange={workspace.setSelectedCardId}
            onCompareOpenChange={chatPanelState.setCompareOpen}
            onComparePaneCardIdsChange={chatPanelState.setComparePaneCardIds}
            onComparePanesChange={chatPanelState.setComparePanes}
            onEnsureWidth={resizablePanels.ensureChatWidth}
            width={chatPanelState.chatWidth}
          />
        )}

        <AppOverlays
          canvasToolShortcuts={canvasToolShortcuts}
          createSkillBusy={skillsBusy}
          createSkillTopic={selectedCreateSkillTopic}
          selectionMagnifier={selectionMagnifier}
          settingsOpen={settingsOpen}
          skillPathTopic={selectedSkillPathTopic}
          skillsLabSettings={skillsLab.settings}
          workspace={workspace}
          onBindSkillPath={(topicId, skillPath) => {
            void bindSkillToTopic(topicId, skillPath)
          }}
          onCloseCreateSkill={() => setCreateSkillDialogTopicId(undefined)}
          onCloseSettings={() => setSettingsOpen(false)}
          onCloseSkillPath={() => setSkillPathDialogTopicId(undefined)}
          onCreateSkill={createSkillForActiveTopic}
        />
      </div>
    </ReactFlowProvider>
  )
}

export default App
