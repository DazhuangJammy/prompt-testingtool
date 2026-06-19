import type { Viewport } from '@xyflow/react'

export const CANVAS_VIEWPORT_STORAGE_PREFIX = 'prompt-canvas-viewport'

const STORAGE_SCOPE_FALLBACK = 'workspace'
const VIEWPORT_PRECISION = 1000

export function createCanvasViewportStorageKey(
  canvasId?: string,
  sessionId?: string,
) {
  const normalizedCanvasId = canvasId?.trim()
  if (!normalizedCanvasId) return undefined

  const normalizedScope = sessionId?.trim() || STORAGE_SCOPE_FALLBACK
  return [
    CANVAS_VIEWPORT_STORAGE_PREFIX,
    encodeURIComponent(normalizedCanvasId),
    encodeURIComponent(normalizedScope),
  ].join(':')
}

export function parseStoredCanvasViewport(value: string | null) {
  if (!value) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isViewportLike(parsed)) return undefined

    return {
      x: parsed.x,
      y: parsed.y,
      zoom: parsed.zoom,
    }
  } catch {
    return undefined
  }
}

export function serializeCanvasViewport(viewport: Viewport) {
  return JSON.stringify({
    x: roundViewportNumber(viewport.x),
    y: roundViewportNumber(viewport.y),
    zoom: roundViewportNumber(viewport.zoom),
  })
}

export function readStoredCanvasViewport(storageKey?: string) {
  if (!storageKey || typeof window === 'undefined') return undefined

  return parseStoredCanvasViewport(window.localStorage.getItem(storageKey))
}

export function saveStoredCanvasViewport(
  storageKey: string | undefined,
  viewport: Viewport,
) {
  if (!storageKey || typeof window === 'undefined') return

  window.localStorage.setItem(storageKey, serializeCanvasViewport(viewport))
}

export function copyStoredCanvasViewport({
  sourceCanvasId,
  sourceSessionId,
  targetCanvasId,
  targetSessionId,
}: {
  sourceCanvasId?: string
  sourceSessionId?: string
  targetCanvasId?: string
  targetSessionId?: string
}) {
  const sourceKey = createCanvasViewportStorageKey(
    sourceCanvasId,
    sourceSessionId,
  )
  const targetKey = createCanvasViewportStorageKey(
    targetCanvasId,
    targetSessionId,
  )
  const sourceViewport = readStoredCanvasViewport(sourceKey)
  if (!sourceViewport) return

  saveStoredCanvasViewport(targetKey, sourceViewport)
}

function roundViewportNumber(value: number) {
  return Math.round(value * VIEWPORT_PRECISION) / VIEWPORT_PRECISION
}

function isViewportLike(value: unknown): value is Viewport {
  if (!value || typeof value !== 'object') return false

  const viewport = value as Partial<Viewport>
  return (
    isFiniteNumber(viewport.x) &&
    isFiniteNumber(viewport.y) &&
    isFiniteNumber(viewport.zoom) &&
    viewport.zoom > 0
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
