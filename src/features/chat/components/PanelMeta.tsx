import { GitCompare } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface PanelMetaProps {
  activeProviderId?: string
  compareDisabled?: boolean
  compareLabel?: string
  compareOpen?: boolean
  providers: Array<{ id: string; name: string; model: string }>
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
      <select
        aria-label="服务商"
        value={activeProviderId ?? ''}
        onChange={(event) => onSelectProvider(event.target.value)}
      >
        {!providers.length && <option value="">服务商</option>}
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name || provider.model}
          </option>
        ))}
      </select>
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
