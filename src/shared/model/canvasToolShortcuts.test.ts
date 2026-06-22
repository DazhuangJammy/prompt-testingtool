import { describe, expect, it } from 'vitest'
import {
  defaultCanvasToolShortcuts,
  formatCanvasToolTooltip,
  getCanvasToolForShortcut,
  normalizeCanvasShortcutKey,
  normalizeCanvasToolShortcuts,
  updateCanvasToolShortcut,
} from './canvasToolShortcuts'

describe('canvas tool shortcuts', () => {
  it('normalizes single digit and letter keys', () => {
    expect(normalizeCanvasShortcutKey('  A ')).toBe('a')
    expect(normalizeCanvasShortcutKey('7')).toBe('7')
    expect(normalizeCanvasShortcutKey('Enter')).toBe('')
  })

  it('keeps defaults as the single source of truth', () => {
    expect(defaultCanvasToolShortcuts).toMatchObject({
      pan: '1',
      select: '2',
      prompt: '3',
      input: '',
      step: '4',
      decision: '5',
      text: '6',
      pen: '7',
    })
  })

  it('removes duplicate keys when a shortcut is reassigned', () => {
    const shortcuts = updateCanvasToolShortcut(
      defaultCanvasToolShortcuts,
      'pen',
      '1',
    )

    expect(shortcuts.pen).toBe('1')
    expect(shortcuts.pan).toBe('')
    expect(getCanvasToolForShortcut(shortcuts, '1')).toBe('pen')
  })

  it('fills missing tools and ignores invalid stored keys', () => {
    const shortcuts = normalizeCanvasToolShortcuts({
      pan: 'Enter',
      select: 'a',
    })

    expect(shortcuts.pan).toBe('')
    expect(shortcuts.select).toBe('a')
    expect(shortcuts.prompt).toBe('3')
  })

  it('formats tooltip labels with the configured key', () => {
    expect(formatCanvasToolTooltip('pan', defaultCanvasToolShortcuts)).toBe(
      '1 拖动画布',
    )
  })
})
