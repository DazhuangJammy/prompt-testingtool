import { GitCompare } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProviderConfig } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { ChatModelPicker } from './ChatModelPicker'

interface PanelMetaProps {
  activeProviderId?: string
  compareDisabled?: boolean
  compareLabel?: string
  compareOpen?: boolean
  providers: ProviderConfig[]
  extraActions?: ReactNode
  onToggleCompare?: () => void
  onSelectProvider: (id: string) => void
}

export function PanelMeta({
  activeProviderId,
  compareDisabled = false,
  compareLabel = '对比',
  compareOpen = false,
  providers,
  extraActions,
  onToggleCompare,
  onSelectProvider,
}: PanelMetaProps) {
  return (
    <div className="panel-meta">
      <ChatModelPicker
        activeProviderId={activeProviderId}
        providers={providers}
        onSelectProvider={onSelectProvider}
      />
      {onToggleCompare && (
        <IconButton
          active={compareOpen}
          icon={<GitCompare />}
          label={compareLabel}
          disabled={compareDisabled}
          onClick={onToggleCompare}
        />
      )}
      {extraActions}
    </div>
  )
}
