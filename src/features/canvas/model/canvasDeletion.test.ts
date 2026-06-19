import { describe, expect, it } from 'vitest'
import { shouldDeleteEdgeRecordOnFlowDelete } from './canvasDeletion'

describe('canvas deletion', () => {
  it('keeps related edge records when only a node is deleted', () => {
    expect(
      shouldDeleteEdgeRecordOnFlowDelete({
        deletedNodeCount: 1,
        edgeId: 'edge',
        selectedEdgeIds: [],
      }),
    ).toBe(false)
  })

  it('deletes edge records when the edge itself is selected or deleted alone', () => {
    expect(
      shouldDeleteEdgeRecordOnFlowDelete({
        deletedNodeCount: 1,
        edgeId: 'edge',
        selectedEdgeIds: ['edge'],
      }),
    ).toBe(true)
    expect(
      shouldDeleteEdgeRecordOnFlowDelete({
        deletedNodeCount: 0,
        edgeId: 'edge',
        selectedEdgeIds: [],
      }),
    ).toBe(true)
  })
})
