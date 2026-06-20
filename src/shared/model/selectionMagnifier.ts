export interface SelectionMagnifierSettings {
  backgroundColor: string
  backgroundOpacity: number
  borderColor: string
  borderRadius: number
  enabled: boolean
  fontSize: number
  textColor: string
}

export const defaultSelectionMagnifierSettings: SelectionMagnifierSettings = {
  backgroundColor: '#1f1f1f',
  backgroundOpacity: 88,
  borderColor: '#2f2f2f',
  borderRadius: 8,
  enabled: false,
  fontSize: 34,
  textColor: '#ededed',
}

export function normalizeSelectionMagnifierSettings(
  value: Partial<SelectionMagnifierSettings> | undefined,
): SelectionMagnifierSettings {
  return {
    backgroundColor: normalizeMagnifierColor(
      value?.backgroundColor,
      defaultSelectionMagnifierSettings.backgroundColor,
    ),
    backgroundOpacity: normalizeMagnifierOpacity(value?.backgroundOpacity),
    borderColor: normalizeMagnifierColor(
      value?.borderColor,
      defaultSelectionMagnifierSettings.borderColor,
    ),
    borderRadius: normalizeMagnifierBorderRadius(value?.borderRadius),
    enabled: Boolean(value?.enabled),
    fontSize: normalizeMagnifierFontSize(value?.fontSize),
    textColor: normalizeMagnifierColor(
      value?.textColor,
      defaultSelectionMagnifierSettings.textColor,
    ),
  }
}

export function normalizeMagnifierFontSize(value: unknown) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return defaultSelectionMagnifierSettings.fontSize
  }
  return Math.min(72, Math.max(18, Math.round(numberValue)))
}

export function normalizeMagnifierBorderRadius(value: unknown) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return defaultSelectionMagnifierSettings.borderRadius
  }
  return Math.min(28, Math.max(0, Math.round(numberValue)))
}

export function normalizeMagnifierOpacity(value: unknown) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return defaultSelectionMagnifierSettings.backgroundOpacity
  }
  return Math.min(100, Math.max(0, Math.round(numberValue)))
}

export function magnifierTransparencyToAlpha(transparency: number) {
  const normalizedTransparency = normalizeMagnifierOpacity(transparency)
  return (100 - normalizedTransparency) / 100
}

export function normalizeMagnifierTextColor(value: unknown) {
  return normalizeMagnifierColor(value, defaultSelectionMagnifierSettings.textColor)
}

export function normalizeMagnifierColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
    return fallback
  }
  return normalized.toLowerCase()
}
