import { describe, expect, it } from 'vitest'
import type { Canvas } from '@/shared/types'
import {
  createReorderedCanvasSortUpdates,
  sortCanvasesForSidebar,
} from './canvasOrdering'

const canvas = (updates: Partial<Canvas>): Canvas => ({
  id: updates.id ?? 'canvas',
  title: updates.title ?? '画布',
  createdAt: updates.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: updates.updatedAt ?? '2026-01-01T00:00:00.000Z',
  sortOrder: updates.sortOrder,
})

describe('canvas ordering', () => {
  it('keeps canvas order stable by created time instead of updated time', () => {
    const sorted = sortCanvasesForSidebar([
      canvas({
        id: 'newer',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-10T00:00:00.000Z',
      }),
      canvas({
        id: 'older',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-20T00:00:00.000Z',
      }),
    ])

    expect(sorted.map((item) => item.id)).toEqual(['older', 'newer'])
  })

  it('uses explicit sort orders after dragging canvases', () => {
    const updates = createReorderedCanvasSortUpdates(
      [
        canvas({ id: 'one', sortOrder: 1 }),
        canvas({ id: 'two', sortOrder: 2 }),
        canvas({ id: 'three', sortOrder: 3 }),
      ],
      'three',
      'one',
    )

    expect(updates).toEqual([
      { id: 'three', sortOrder: 1 },
      { id: 'one', sortOrder: 2 },
      { id: 'two', sortOrder: 3 },
    ])
  })
})
