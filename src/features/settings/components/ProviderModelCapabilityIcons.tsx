import {
  Brain,
  Database,
  Eye,
  ListFilter,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ProviderModelCapability, ProviderModelConfig } from '@/shared/types'
import {
  MODEL_CAPABILITY_LABELS,
  getModelCapabilities,
  getVisibleModelCapabilityTags,
} from '@/shared/model/providerModelCapabilities'
import { hideTooltip, showTooltip } from '@/shared/ui/tooltip'

const CAPABILITY_ICONS: Record<
  Exclude<ProviderModelCapability, 'chat'>,
  LucideIcon
> = {
  reasoning: Brain,
  embedding: Database,
  rerank: ListFilter,
  vision: Eye,
  'function-call': Wrench,
}

function isIconCapability(
  capability: ProviderModelCapability,
): capability is Exclude<ProviderModelCapability, 'chat'> {
  return capability !== 'chat'
}

export function ProviderModelCapabilityIcons({
  model,
}: {
  model: ProviderModelConfig
}) {
  const capabilities = getVisibleModelCapabilityTags(
    getModelCapabilities(model),
  ).filter(isIconCapability)

  if (!capabilities.length) return <span className="provider-model-tags" />

  return (
    <span className="provider-model-tags" aria-label="模型标签">
      {capabilities.map((capability) => {
        const Icon = CAPABILITY_ICONS[capability]
        const label = MODEL_CAPABILITY_LABELS[capability]

        return (
          <span
            key={capability}
            aria-label={label}
            role="img"
            tabIndex={0}
            onBlur={hideTooltip}
            onFocus={(event) => showTooltip(event.currentTarget, label)}
            onMouseEnter={(event) => showTooltip(event.currentTarget, label)}
            onMouseLeave={hideTooltip}
          >
            <Icon aria-hidden />
          </span>
        )
      })}
    </span>
  )
}
