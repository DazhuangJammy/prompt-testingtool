import { describe, expect, it } from 'vitest'
import {
  isFocusLeavingContainer,
  isTargetOutsideContainer,
} from './editorFocus'

describe('editor focus helpers', () => {
  it('keeps editing when focus moves inside the editor', () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    container.append(input)

    expect(isFocusLeavingContainer(container, input)).toBe(false)
  })

  it('commits editing when focus moves outside the editor', () => {
    const container = document.createElement('div')
    const outside = document.createElement('button')

    expect(isFocusLeavingContainer(container, outside)).toBe(true)
  })

  it('commits editing when focus leaves the document', () => {
    const container = document.createElement('div')

    expect(isFocusLeavingContainer(container, null)).toBe(true)
  })

  it('detects pointer targets outside the editor', () => {
    const container = document.createElement('div')
    const inside = document.createElement('input')
    const outside = document.createElement('button')
    container.append(inside)

    expect(isTargetOutsideContainer(container, inside)).toBe(false)
    expect(isTargetOutsideContainer(container, outside)).toBe(true)
  })
})
