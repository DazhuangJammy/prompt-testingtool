import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCollapsedCanvasIdsStorageKey,
  normalizeCollapsedCanvasIds,
  readStoredCollapsedCanvasIds,
  toggleCollapsedCanvasId,
  writeStoredCollapsedCanvasIds,
} from './collapsedCanvasIds'

describe('collapsed canvas ids', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores collapsed project groups after refresh', () => {
    writeStoredCollapsedCanvasIds(new Set(['canvas-a', 'canvas-b']))

    expect(Array.from(readStoredCollapsedCanvasIds())).toEqual([
      'canvas-a',
      'canvas-b',
    ])
  })

  it('toggles one canvas id without mutating the current set', () => {
    const current = new Set(['canvas-a'])
    const expanded = toggleCollapsedCanvasId(current, 'canvas-a')
    const collapsed = toggleCollapsedCanvasId(expanded, 'canvas-b')

    expect(Array.from(current)).toEqual(['canvas-a'])
    expect(Array.from(expanded)).toEqual([])
    expect(Array.from(collapsed)).toEqual(['canvas-b'])
  })

  it('normalizes stale stored values', () => {
    expect(normalizeCollapsedCanvasIds([' canvas-a ', '', 'canvas-a', 3])).toEqual([
      'canvas-a',
    ])
    expect(normalizeCollapsedCanvasIds({})).toEqual([])
  })

  it('keeps the storage key in one place', () => {
    expect(getCollapsedCanvasIdsStorageKey()).toBe(
      'prompt-sidebar-collapsed-canvas-ids',
    )
  })
})
