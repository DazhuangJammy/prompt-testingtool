import type { CanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import type {
  DefaultModelSettings,
  InputCard,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'

export interface CanvasWorkspaceProps {
  effectiveCanvasId?: string
  activeSessionId?: string
  activeSessionCreatedAt?: string
  activeSessionPromptCardId?: string
  flowchartProvider?: ProviderConfig
  flowchartSettings?: DefaultModelSettings
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  toolShortcuts: CanvasToolShortcuts
  promptCards: PromptCard[]
  onAddInputCard: (position?: InputCard['position'], topicSessionId?: string) => void
  onAddPrompt: (position?: PromptCard['position'], topicSessionId?: string) => void
  onDeleteCard: (id: string) => void
  onDeleteInputCard: (id: string) => void
  onSelectCard: (id: string) => void
}
