export function getTextOffsetFromPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const point = caretPointFromCoordinates(clientX, clientY)
  if (!point || !container.contains(point.node)) return undefined

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let offset = 0
  let node = walker.nextNode()

  while (node) {
    if (node === point.node) return offset + point.offset
    offset += node.textContent?.length ?? 0
    node = walker.nextNode()
  }

  return undefined
}

export function placeTextControlCaret(
  control: HTMLInputElement | HTMLTextAreaElement,
  offset?: number,
) {
  control.focus()
  const nextOffset = offset === undefined
    ? control.value.length
    : Math.max(0, Math.min(offset, control.value.length))
  control.setSelectionRange(nextOffset, nextOffset)

  if (control instanceof HTMLTextAreaElement) {
    scrollTextAreaCaretIntoView(control, nextOffset)
  }
}

export function resizeTextAreaToContent(
  textarea: HTMLTextAreaElement,
  options: { minHeight?: number; maxHeight?: number } = {},
) {
  const computed = window.getComputedStyle(textarea)
  const borderHeight =
    (parseCssPixels(computed.borderTopWidth) ?? 0) +
    (parseCssPixels(computed.borderBottomWidth) ?? 0)
  const minHeight = options.minHeight
    ?? parseCssPixels(computed.minHeight)
    ?? 0
  const maxHeight = options.maxHeight ?? parseCssPixels(computed.maxHeight)

  textarea.style.height = 'auto'
  const contentHeight = textarea.scrollHeight + borderHeight
  const nextHeight = Math.ceil(Math.max(minHeight, contentHeight))
  const cappedHeight = maxHeight === undefined
    ? nextHeight
    : Math.min(nextHeight, maxHeight)

  textarea.style.height = `${cappedHeight}px`
  textarea.style.overflowY =
    maxHeight !== undefined && nextHeight > maxHeight ? 'auto' : 'hidden'
}

function caretPointFromCoordinates(clientX: number, clientY: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const position = doc.caretPositionFromPoint?.(clientX, clientY)
  if (position) return { node: position.offsetNode, offset: position.offset }

  const range = doc.caretRangeFromPoint?.(clientX, clientY)
  if (!range) return undefined
  return { node: range.startContainer, offset: range.startOffset }
}

function scrollTextAreaCaretIntoView(
  textarea: HTMLTextAreaElement,
  offset: number,
) {
  const measuredTop = measureTextAreaCaretTop(textarea, offset)
  const estimatedTop = estimateTextAreaCaretTop(textarea, offset)
  const caretTop = measuredTop > 0 ? measuredTop : estimatedTop
  const targetTop = caretTop - textarea.clientHeight * 0.45

  textarea.scrollTop = Math.max(0, targetTop)
}

function measureTextAreaCaretTop(
  textarea: HTMLTextAreaElement,
  offset: number,
) {
  const computed = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  const marker = document.createElement('span')

  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    top: '0',
    left: '-9999px',
    width: `${textarea.clientWidth}px`,
    minHeight: '0',
    height: 'auto',
    overflow: 'hidden',
    boxSizing: 'border-box',
    borderTopWidth: computed.borderTopWidth,
    borderRightWidth: computed.borderRightWidth,
    borderBottomWidth: computed.borderBottomWidth,
    borderLeftWidth: computed.borderLeftWidth,
    paddingTop: computed.paddingTop,
    paddingRight: computed.paddingRight,
    paddingBottom: computed.paddingBottom,
    paddingLeft: computed.paddingLeft,
    font: computed.font,
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    textTransform: computed.textTransform,
    textIndent: computed.textIndent,
    whiteSpace: 'pre-wrap',
    wordBreak: computed.wordBreak,
    overflowWrap: computed.overflowWrap,
  })
  mirror.style.setProperty('tab-size', computed.getPropertyValue('tab-size'))

  mirror.textContent = textarea.value.slice(0, offset)
  marker.textContent = textarea.value[offset] === '\n'
    ? '\u200b'
    : textarea.value[offset] || '\u200b'
  mirror.append(marker)
  document.body.append(mirror)
  const top = marker.offsetTop
  mirror.remove()

  return top
}

function estimateTextAreaCaretTop(
  textarea: HTMLTextAreaElement,
  offset: number,
) {
  const computed = window.getComputedStyle(textarea)
  const fontSize = parseCssPixels(computed.fontSize) ?? 14
  const lineHeight = parseCssPixels(computed.lineHeight) ?? fontSize * 1.4
  const paddingTop = parseCssPixels(computed.paddingTop) ?? 0
  const lineIndex = textarea.value.slice(0, offset).split('\n').length - 1

  return paddingTop + lineIndex * lineHeight
}

function parseCssPixels(value: string) {
  const pixels = Number.parseFloat(value)
  return Number.isFinite(pixels) ? pixels : undefined
}
