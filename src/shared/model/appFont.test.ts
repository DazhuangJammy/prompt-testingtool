import { describe, expect, it } from 'vitest'
import {
  APP_FONT_OPTIONS,
  defaultAppFontId,
  getAppFontOption,
  isAppFontId,
  normalizeAppFontId,
} from './appFont'

describe('appFont', () => {
  it('defines the curated font options in one registry', () => {
    expect(APP_FONT_OPTIONS).toHaveLength(10)
    expect(APP_FONT_OPTIONS.map((option) => option.id)).toContain('lxgw-wenkai')
    expect(APP_FONT_OPTIONS.map((option) => option.id)).toContain('tsanger-jinkai')
  })

  it('normalizes unknown font ids to the default option', () => {
    expect(normalizeAppFontId('missing-font')).toBe(defaultAppFontId)
    expect(normalizeAppFontId(undefined)).toBe(defaultAppFontId)
    expect(normalizeAppFontId('misans')).toBe('misans')
  })

  it('guards and resolves font options', () => {
    expect(isAppFontId('source-han-sans')).toBe(true)
    expect(isAppFontId('unknown')).toBe(false)
    expect(getAppFontOption('source-han-serif').label).toContain('思源宋体')
  })
})
