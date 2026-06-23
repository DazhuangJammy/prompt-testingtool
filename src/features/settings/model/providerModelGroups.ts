import type { ProviderModelConfig } from '@/shared/types'

export interface ProviderModelGroup {
  id: string
  label: string
  models: ProviderModelConfig[]
}

type GroupFallback = 'all' | 'family'

export function groupProviderModels(
  models: ProviderModelConfig[],
  fallback: GroupFallback = 'all',
): ProviderModelGroup[] {
  const groups = new Map<string, ProviderModelGroup>()
  const hasExplicitGroups = models.some((model) => model.group?.trim())

  for (const model of models) {
    const label = getProviderModelGroupLabel(model, hasExplicitGroups, fallback)
    const groupId = label.toLowerCase()
    const existing = groups.get(groupId)

    if (existing) {
      existing.models.push(model)
    } else {
      groups.set(groupId, {
        id: groupId,
        label,
        models: [model],
      })
    }
  }

  return Array.from(groups.values())
}

export function getProviderModelFamilyLabel(model: ProviderModelConfig) {
  return inferProviderModelFamily(model.id)
}

function getProviderModelGroupLabel(
  model: ProviderModelConfig,
  hasExplicitGroups: boolean,
  fallback: GroupFallback,
) {
  const explicitGroup = model.group?.trim()
  if (explicitGroup) return explicitGroup
  if (hasExplicitGroups) return '未分组'
  if (fallback === 'family') return inferProviderModelFamily(model.id)
  return '全部模型'
}

function inferProviderModelFamily(modelId: string) {
  const leaf = modelId.trim().split('/').filter(Boolean).at(-1) ?? modelId.trim()
  const withoutDate = leaf.replace(/[-_]\d{4}[-_]\d{2}[-_]\d{2}$/, '')
  const compactSeries = withoutDate.match(/^([a-z]+[0-9]+(?:\.[0-9]+)?)/i)
  if (compactSeries?.[1]) return compactSeries[1]

  const [firstPart] = withoutDate.split(/[-_]/).filter(Boolean)
  return firstPart || withoutDate || '未分组'
}
