import { GitCompare } from 'lucide-react'
import { IconButton } from '@/shared/ui/IconButton'

interface PanelMetaProps {
  activeProviderId?: string
  compareDisabled?: boolean
  compareOpen?: boolean
  providers: Array<{ id: string; name: string; model: string }>
  onToggleCompare?: () => void
  onSelectProvider: (id: string) => void
}

export function PanelMeta({
  activeProviderId,
  compareDisabled = false,
  compareOpen = false,
  providers,
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
          label="对比"
          disabled={compareDisabled}
          onClick={onToggleCompare}
        />
      )}
    </div>
  )
}
