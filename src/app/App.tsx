import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useState } from 'react'
import '@/styles/app.css'
import { ChatPanel } from '@/features/chat/ChatPanel'
import { CanvasWorkspace } from '@/features/canvas/CanvasWorkspace'
import { WorkspaceTopbar } from '@/features/canvas/WorkspaceTopbar'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { Sidebar } from '@/features/sidebar/Sidebar'
import { providerRepository } from '@/features/settings/infrastructure/providerRepository'
import { useResizablePanels } from './useResizablePanels'
import { useResponsivePanels } from './useResponsivePanels'
import { useThemeMode } from './useThemeMode'
import { useWorkspaceActions } from './useWorkspaceActions'
import { useWorkspaceData } from './useWorkspaceData'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <Sidebar
          canvases={workspace.canvases}
          activeCanvasId={workspace.effectiveCanvasId}
          collapsed={panels.sidebarCollapsed}
          onToggle={panels.toggleSidebar}
          onSelect={workspace.setActiveCanvasId}
          onCreate={actions.createNextCanvas}
          onRename={(id, title) => actions.updateCanvas(id, { title })}
          onDelete={actions.deleteCanvas}
          onExport={actions.exportWorkspace}
          onImport={actions.importWorkspace}
          onResizeStart={resizablePanels.startSidebarResize}
          width={resizablePanels.sidebarWidth}
        />

        <main className="workspace">
          <WorkspaceTopbar
            title={workspace.activeCanvas?.title ?? '工作台'}
            theme={theme}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleTheme={toggleTheme}
          />

          <CanvasWorkspace
            effectiveCanvasId={workspace.effectiveCanvasId}
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
          onToggle={panels.toggleChat}
          onSelectProvider={workspace.setActiveProviderId}
          width={resizablePanels.chatWidth}
        />

        <SettingsDialog
          open={settingsOpen}
          providers={workspace.providers}
          activeProviderId={workspace.effectiveProviderId}
          onClose={() => setSettingsOpen(false)}
          onSelect={workspace.setActiveProviderId}
          onDelete={async (id) => {
            await providerRepository.delete(id)
            if (workspace.effectiveProviderId === id) {
              workspace.setActiveProviderId(undefined)
            }
          }}
          onSave={async (provider) => {
            await providerRepository.save(provider)
            workspace.setActiveProviderId(provider.id)
          }}
        />
      </div>
    </ReactFlowProvider>
  )
}

export default App
