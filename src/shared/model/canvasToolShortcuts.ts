export const CANVAS_TOOL_ORDER = [
  'pan',
  'select',
  'prompt',
  'step',
  'decision',
  'text',
  'pen',
] as const

export type CanvasTool = (typeof CANVAS_TOOL_ORDER)[number]

export type CanvasToolShortcuts = Record<CanvasTool, string>

export const canvasToolLabels: Record<CanvasTool, string> = {
  decision: '判断',
  pan: '拖动画布',
  pen: '画笔',
  prompt: '提示词',
  select: '选择',
  step: '步骤',
  text: '文本',
}

export const defaultCanvasToolShortcuts: CanvasToolShortcuts = {
  decision: '5',
  pan: '1',
  pen: '7',
  prompt: '3',
  select: '2',
  step: '4',
  text: '6',
}

export function normalizeCanvasShortcutKey(key: string) {
  const normalized = key.trim().toLowerCase()
  if (/^[0-9a-z]$/.test(normalized)) return normalized
  return ''
}

export function normalizeCanvasToolShortcuts(
  shortcuts?: Partial<Record<CanvasTool, string>>,
): CanvasToolShortcuts {
  const usedKeys = new Set<string>()
  const normalized = { ...defaultCanvasToolShortcuts }

  CANVAS_TOOL_ORDER.forEach((tool) => {
    const key = normalizeCanvasShortcutKey(shortcuts?.[tool] ?? normalized[tool])
    if (!key || usedKeys.has(key)) {
      normalized[tool] = ''
      return
    }

    normalized[tool] = key
    usedKeys.add(key)
  })

  return normalized
}

export function updateCanvasToolShortcut(
  shortcuts: CanvasToolShortcuts,
  tool: CanvasTool,
  key: string,
): CanvasToolShortcuts {
  const normalizedKey = normalizeCanvasShortcutKey(key)
  const next = { ...shortcuts }

  CANVAS_TOOL_ORDER.forEach((candidate) => {
    if (candidate !== tool && normalizedKey && next[candidate] === normalizedKey) {
      next[candidate] = ''
    }
  })

  next[tool] = normalizedKey
  return normalizeCanvasToolShortcuts(next)
}

export function getCanvasToolForShortcut(
  shortcuts: CanvasToolShortcuts,
  key: string,
) {
  const normalizedKey = normalizeCanvasShortcutKey(key)
  if (!normalizedKey) return undefined
  return CANVAS_TOOL_ORDER.find((tool) => shortcuts[tool] === normalizedKey)
}

export function formatCanvasToolTooltip(
  tool: CanvasTool,
  shortcuts: CanvasToolShortcuts,
) {
  const shortcut = shortcuts[tool]
  return shortcut ? `${shortcut} ${canvasToolLabels[tool]}` : canvasToolLabels[tool]
}
