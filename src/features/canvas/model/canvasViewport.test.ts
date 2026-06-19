import { beforeEach, describe, expect, it } from 'vitest'
import {
  copyStoredCanvasViewport,
  createCanvasViewportStorageKey,
  parseStoredCanvasViewport,
  readStoredCanvasViewport,
  saveStoredCanvasViewport,
  serializeCanvasViewport,
} from '@/features/canvas/model/canvasViewport'

describe('canvasViewport', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates scoped storage keys per canvas and topic session', () => {
    expect(createCanvasViewportStorageKey('canvas 1', 'topic/a')).toBe(
      'prompt-canvas-viewport:canvas%201:topic%2Fa',
    )
  })

  it('falls back to workspace scope when there is no active topic session', () => {
    expect(createCanvasViewportStorageKey('canvas-1')).toBe(
      'prompt-canvas-viewport:canvas-1:workspace',
    )
  })

  it('does not create a storage key without a canvas id', () => {
    expect(createCanvasViewportStorageKey(undefined, 'topic-1')).toBeUndefined()
    expect(createCanvasViewportStorageKey('   ', 'topic-1')).toBeUndefined()
  })

  it('parses valid stored viewports', () => {
    expect(parseStoredCanvasViewport('{"x":12,"y":-34,"zoom":0.75}')).toEqual({
      x: 12,
      y: -34,
      zoom: 0.75,
    })
  })

  it('rejects invalid stored viewports', () => {
    expect(parseStoredCanvasViewport(null)).toBeUndefined()
    expect(parseStoredCanvasViewport('{bad json')).toBeUndefined()
    expect(parseStoredCanvasViewport('{"x":0,"y":0,"zoom":0}')).toBeUndefined()
    expect(parseStoredCanvasViewport('{"x":0,"y":"0","zoom":1}')).toBeUndefined()
  })

  it('serializes viewports with stable precision', () => {
    expect(
      serializeCanvasViewport({
        x: 1.23456,
        y: -9.87654,
        zoom: 0.67891,
      }),
    ).toBe('{"x":1.235,"y":-9.877,"zoom":0.679}')
  })

  it('reads and saves viewport values in local storage', () => {
    const storageKey = createCanvasViewportStorageKey('canvas-1', 'topic-1')

    saveStoredCanvasViewport(storageKey, {
      x: 12.3456,
      y: -45.6789,
      zoom: 0.8888,
    })

    expect(readStoredCanvasViewport(storageKey)).toEqual({
      x: 12.346,
      y: -45.679,
      zoom: 0.889,
    })
  })

  it('ignores missing storage keys', () => {
    saveStoredCanvasViewport(undefined, { x: 1, y: 2, zoom: 1 })

    expect(readStoredCanvasViewport(undefined)).toBeUndefined()
    expect(window.localStorage.length).toBe(0)
  })

  it('copies a stored viewport from one topic to another', () => {
    const sourceKey = createCanvasViewportStorageKey('canvas-1', 'source')
    const targetKey = createCanvasViewportStorageKey('canvas-1', 'target')
    saveStoredCanvasViewport(sourceKey, { x: 20, y: -30, zoom: 0.55 })

    copyStoredCanvasViewport({
      sourceCanvasId: 'canvas-1',
      sourceSessionId: 'source',
      targetCanvasId: 'canvas-1',
      targetSessionId: 'target',
    })

    expect(readStoredCanvasViewport(targetKey)).toEqual({
      x: 20,
      y: -30,
      zoom: 0.55,
    })
  })

  it('does not create a target viewport when the source has no stored viewport', () => {
    const targetKey = createCanvasViewportStorageKey('canvas-1', 'target')

    copyStoredCanvasViewport({
      sourceCanvasId: 'canvas-1',
      sourceSessionId: 'missing',
      targetCanvasId: 'canvas-1',
      targetSessionId: 'target',
    })

    expect(readStoredCanvasViewport(targetKey)).toBeUndefined()
  })
})
