import { describe, expect, it } from 'vitest'
import {
  areFlowSelectionsEqual,
  emptyFlowSelection,
  toFlowSelectionIds,
} from './flowSelection'

describe('flow selection', () => {
  it('treats matching node and edge ids as equal', () => {
    expect(
      areFlowSelectionsEqual(
        { edges: ['edge-1'], nodes: ['node-1', 'node-2'] },
        { edges: ['edge-1'], nodes: ['node-1', 'node-2'] },
      ),
    ).toBe(true)
  })

  it('keeps ordered selection ids explicit', () => {
    expect(
      areFlowSelectionsEqual(
        { edges: [], nodes: ['node-1', 'node-2'] },
        { edges: [], nodes: ['node-2', 'node-1'] },
      ),
    ).toBe(false)
  })

  it('maps flow selections to the ids used by the toolbar', () => {
    expect(
      toFlowSelectionIds({
        edges: [{ id: 'edge-1' }],
        nodes: [{ id: 'node-1' }, { id: 'node-2' }],
      }),
    ).toEqual({
      edges: ['edge-1'],
      nodes: ['node-1', 'node-2'],
    })
  })

  it('exposes a shared empty selection value', () => {
    expect(emptyFlowSelection).toEqual({ edges: [], nodes: [] })
  })
})
