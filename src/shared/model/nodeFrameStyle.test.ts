import { describe, expect, it } from 'vitest'
import {
  defaultNodeFrameStyle,
  mergeCanvasNodeFrameStyle,
  normalizeFrameColorInput,
  resolveCanvasNodeFrameStyle,
} from './nodeFrameStyle'

describe('node frame style model', () => {
  it('resolves missing frame style to neutral defaults', () => {
    expect(resolveCanvasNodeFrameStyle()).toEqual(defaultNodeFrameStyle)
  })

  it('stores explicit frame color and highlighter values', () => {
    expect(
      mergeCanvasNodeFrameStyle(undefined, {
        borderColor: '#ededed',
        highlighted: true,
      }),
    ).toEqual({
      borderColor: '#ededed',
      highlighted: true,
    })

    expect(
      mergeCanvasNodeFrameStyle(
        { borderColor: '#ededed', highlighted: true },
        { borderColor: defaultNodeFrameStyle.borderColor, highlighted: false },
      ),
    ).toEqual({
      borderColor: defaultNodeFrameStyle.borderColor,
    })
  })

  it('drops empty highlight-only styles after highlight is disabled', () => {
    expect(
      mergeCanvasNodeFrameStyle({ highlighted: true }, { highlighted: false }),
    ).toBeUndefined()
  })

  it('normalizes color input values for browser color controls', () => {
    expect(normalizeFrameColorInput('#ededed')).toBe('#ededed')
    expect(normalizeFrameColorInput('var(--line)')).toBe(
      defaultNodeFrameStyle.borderColor,
    )
  })
})
