import { describe, expect, it } from 'vitest'
import {
  getStrokeBounds,
  movePoints,
  simplifyPoints,
  toStrokeViewPoints,
} from './strokeGeometry'

describe('stroke geometry', () => {
  it('keeps meaningful points while simplifying tiny movements', () => {
    expect(
      simplifyPoints([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 8, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ])
  })

  it('moves every point by a delta', () => {
    expect(movePoints([{ x: 1, y: 2 }], { x: 3, y: -1 })).toEqual([
      { x: 4, y: 1 },
    ])
  })

  it('calculates padded bounds for a stroke', () => {
    expect(
      getStrokeBounds(
        [
          { x: 10, y: 20 },
          { x: 30, y: 5 },
        ],
        4,
      ),
    ).toEqual({
      height: 23,
      minX: 6,
      minY: 1,
      width: 28,
    })
  })

  it('converts absolute stroke points into node-local points', () => {
    expect(
      toStrokeViewPoints(
        [
          { x: 10, y: 20 },
          { x: 30, y: 5 },
        ],
        { minX: 6, minY: 1 },
      ),
    ).toEqual([
      { x: 4, y: 19 },
      { x: 24, y: 4 },
    ])
  })
})
