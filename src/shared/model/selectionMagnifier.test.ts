import { describe, expect, it } from 'vitest'
import {
  defaultSelectionMagnifierSettings,
  magnifierTransparencyToAlpha,
  normalizeMagnifierBorderRadius,
  normalizeMagnifierFontSize,
  normalizeMagnifierOpacity,
  normalizeMagnifierTextColor,
  normalizeSelectionMagnifierSettings,
} from './selectionMagnifier'

describe('selectionMagnifier', () => {
  it('normalizes missing settings to defaults', () => {
    expect(normalizeSelectionMagnifierSettings(undefined)).toEqual(
      defaultSelectionMagnifierSettings,
    )
  })

  it('clamps font size into the supported range', () => {
    expect(normalizeMagnifierFontSize(8)).toBe(18)
    expect(normalizeMagnifierFontSize(40.6)).toBe(41)
    expect(normalizeMagnifierFontSize(120)).toBe(72)
    expect(normalizeMagnifierFontSize('bad')).toBe(
      defaultSelectionMagnifierSettings.fontSize,
    )
  })

  it('accepts hex text colors and rejects invalid colors', () => {
    expect(normalizeMagnifierTextColor('#ABCDEF')).toBe('#abcdef')
    expect(normalizeMagnifierTextColor('green')).toBe(
      defaultSelectionMagnifierSettings.textColor,
    )
  })

  it('clamps border radius and opacity settings', () => {
    expect(normalizeMagnifierBorderRadius(-2)).toBe(0)
    expect(normalizeMagnifierBorderRadius(12.4)).toBe(12)
    expect(normalizeMagnifierBorderRadius(80)).toBe(28)
    expect(normalizeMagnifierOpacity(-5)).toBe(0)
    expect(normalizeMagnifierOpacity(68.8)).toBe(69)
    expect(normalizeMagnifierOpacity(120)).toBe(100)
  })

  it('converts background transparency into CSS alpha', () => {
    expect(magnifierTransparencyToAlpha(0)).toBe(1)
    expect(magnifierTransparencyToAlpha(42)).toBe(0.58)
    expect(magnifierTransparencyToAlpha(100)).toBe(0)
  })

  it('normalizes extended visual settings', () => {
    expect(
      normalizeSelectionMagnifierSettings({
        backgroundColor: '#FFFFFF',
        backgroundOpacity: 42,
        borderColor: '#AAAAAA',
        borderRadius: 14,
        textColor: '#111111',
      }),
    ).toMatchObject({
      backgroundColor: '#ffffff',
      backgroundOpacity: 42,
      borderColor: '#aaaaaa',
      borderRadius: 14,
      textColor: '#111111',
    })
  })
})
