import { Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  magnifierTransparencyToAlpha,
  type SelectionMagnifierSettings,
} from '@/shared/model/selectionMagnifier'

interface SelectedTextState {
  rect: DOMRect
  text: string
}

interface SelectionMagnifierOverlayProps {
  settings: SelectionMagnifierSettings
}

const allowedSurfaceSelector = '.workspace, .chat-panel'
const editableSelector = 'input, textarea'

export function SelectionMagnifierOverlay({
  settings,
}: SelectionMagnifierOverlayProps) {
  const [selection, setSelection] = useState<SelectedTextState>()
  const [previewSelection, setPreviewSelection] = useState<SelectedTextState>()
  const selectionRef = useRef<SelectedTextState | undefined>(undefined)
  const previewSelectionRef = useRef<SelectedTextState | undefined>(undefined)
  const preserveSelectionUntilRef = useRef(0)

  const setTrackedSelection = useCallback((nextSelection?: SelectedTextState) => {
    selectionRef.current = nextSelection
    setSelection(nextSelection)
  }, [])

  const setTrackedPreviewSelection = useCallback(
    (nextSelection?: SelectedTextState) => {
      previewSelectionRef.current = nextSelection
      setPreviewSelection(nextSelection)
    },
    [],
  )

  const refreshSelection = useCallback(() => {
    if (!settings.enabled) {
      setTrackedSelection(undefined)
      setTrackedPreviewSelection(undefined)
      return
    }

    const nextSelection = readAllowedSelection()
    if (!nextSelection) {
      if (
        previewSelectionRef.current ||
        window.performance.now() < preserveSelectionUntilRef.current
      ) {
        return
      }
      setTrackedSelection(undefined)
      return
    }

    if (!isSameSelection(selectionRef.current, nextSelection)) {
      setTrackedPreviewSelection(undefined)
    }
    setTrackedSelection(nextSelection)
  }, [setTrackedPreviewSelection, setTrackedSelection, settings.enabled])

  useEffect(() => {
    if (!settings.enabled) return

    const refreshLater = () => window.setTimeout(refreshSelection, 0)
    const closePreview = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.selection-magnifier-layer')) {
        return
      }
      if (!previewSelectionRef.current) return
      event.preventDefault()
      preserveSelectionUntilRef.current = window.performance.now() + 500
      setTrackedPreviewSelection(undefined)
    }
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setTrackedPreviewSelection(undefined)
      setTrackedSelection(undefined)
    }
    const copySelection = (event: ClipboardEvent) => {
      const selectedText = readAllowedSelection()?.text ?? selectionRef.current?.text
      if (!selectedText || !event.clipboardData) return
      if (event.clipboardData.getData('text/plain')) return
      event.clipboardData.setData('text/plain', selectedText)
    }

    document.addEventListener('selectionchange', refreshLater)
    document.addEventListener('mouseup', refreshLater)
    document.addEventListener('keyup', refreshLater)
    document.addEventListener('pointerdown', closePreview, true)
    document.addEventListener('keydown', clearOnEscape)
    document.addEventListener('copy', copySelection)
    return () => {
      document.removeEventListener('selectionchange', refreshLater)
      document.removeEventListener('mouseup', refreshLater)
      document.removeEventListener('keyup', refreshLater)
      document.removeEventListener('pointerdown', closePreview, true)
      document.removeEventListener('keydown', clearOnEscape)
      document.removeEventListener('copy', copySelection)
    }
  }, [
    refreshSelection,
    setTrackedPreviewSelection,
    setTrackedSelection,
    settings.enabled,
  ])

  if (!settings.enabled || (!selection && !previewSelection)) return null

  const buttonStyle = {
    left: `${Math.min((selection?.rect.right ?? 0) + 8, window.innerWidth - 44)}px`,
    top: `${Math.min((selection?.rect.bottom ?? 0) - 6, window.innerHeight - 44)}px`,
  }
  const previewStyle = {
    backgroundColor: hexToRgba(
      settings.backgroundColor,
      magnifierTransparencyToAlpha(settings.backgroundOpacity),
    ),
    borderColor: settings.borderColor,
    borderRadius: `${settings.borderRadius}px`,
    color: settings.textColor,
    fontSize: `${settings.fontSize}px`,
    left: `${Math.min(previewSelection?.rect.left ?? 0, window.innerWidth - 160)}px`,
    top: `${Math.max(10, (previewSelection?.rect.top ?? 0) - settings.fontSize - 16)}px`,
  }

  return (
    <div
      className="selection-magnifier-layer"
      aria-hidden={!selection && !previewSelection}
    >
      {previewSelection && (
        <div className="selection-magnifier-preview" style={previewStyle}>
          {previewSelection.text}
        </div>
      )}
      {selection && !previewSelection && (
        <button
          type="button"
          className="selection-magnifier-button"
          aria-label="放大选中文字"
          style={buttonStyle}
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setTrackedPreviewSelection(selection)}
        >
          <Search size={16} />
        </button>
      )}
    </div>
  )
}

function isSameSelection(
  current: SelectedTextState | undefined,
  next: SelectedTextState,
) {
  if (!current || current.text !== next.text) return false
  return (
    Math.abs(current.rect.left - next.rect.left) < 2 &&
    Math.abs(current.rect.top - next.rect.top) < 2 &&
    Math.abs(current.rect.right - next.rect.right) < 2 &&
    Math.abs(current.rect.bottom - next.rect.bottom) < 2
  )
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const opacity = Math.min(1, Math.max(0, alpha))
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function readAllowedSelection(): SelectedTextState | undefined {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLInputElement) {
    return readEditableSelection(activeElement)
  }
  if (activeElement instanceof HTMLTextAreaElement) {
    return readEditableSelection(activeElement)
  }

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return undefined
  }

  const text = selection.toString().trim()
  if (!text) return undefined

  const range = selection.getRangeAt(0)
  if (!isInsideAllowedSurface(range.commonAncestorContainer)) return undefined

  const rect = firstUsableRect(range)
  if (!rect) return undefined
  return { rect, text }
}

function readEditableSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
): SelectedTextState | undefined {
  if (!element.matches(editableSelector) || !isInsideAllowedSurface(element)) {
    return undefined
  }
  const start = element.selectionStart ?? 0
  const end = element.selectionEnd ?? 0
  if (start === end) return undefined

  const text = element.value.slice(start, end).trim()
  if (!text) return undefined
  return {
    rect: resolveEditableSelectionRect(element, end) ?? element.getBoundingClientRect(),
    text,
  }
}

function resolveEditableSelectionRect(
  element: HTMLInputElement | HTMLTextAreaElement,
  selectionEnd: number,
) {
  const elementRect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const mirror = document.createElement('div')
  const marker = document.createElement('span')
  const lineHeight =
    Number.parseFloat(styles.lineHeight) ||
    Number.parseFloat(styles.fontSize) ||
    elementRect.height

  mirror.style.borderBottomWidth = styles.borderBottomWidth
  mirror.style.borderLeftWidth = styles.borderLeftWidth
  mirror.style.borderRightWidth = styles.borderRightWidth
  mirror.style.borderTopWidth = styles.borderTopWidth
  mirror.style.boxSizing = styles.boxSizing
  mirror.style.fontFamily = styles.fontFamily
  mirror.style.fontSize = styles.fontSize
  mirror.style.fontStyle = styles.fontStyle
  mirror.style.fontWeight = styles.fontWeight
  mirror.style.height = `${elementRect.height}px`
  mirror.style.left = `${elementRect.left}px`
  mirror.style.letterSpacing = styles.letterSpacing
  mirror.style.lineHeight = styles.lineHeight
  mirror.style.overflow = 'hidden'
  mirror.style.paddingBottom = styles.paddingBottom
  mirror.style.paddingLeft = styles.paddingLeft
  mirror.style.paddingRight = styles.paddingRight
  mirror.style.paddingTop = styles.paddingTop
  mirror.style.pointerEvents = 'none'
  mirror.style.position = 'fixed'
  mirror.style.textAlign = styles.textAlign
  mirror.style.textTransform = styles.textTransform
  mirror.style.top = `${elementRect.top}px`
  mirror.style.visibility = 'hidden'
  mirror.style.whiteSpace =
    element instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre'
  mirror.style.width = `${elementRect.width}px`
  mirror.style.wordBreak = styles.wordBreak
  mirror.style.overflowWrap = styles.overflowWrap

  mirror.append(document.createTextNode(element.value.slice(0, selectionEnd)))
  marker.textContent = '\u200b'
  mirror.append(marker)
  document.body.append(mirror)

  const markerRect = marker.getBoundingClientRect()
  mirror.remove()

  if (!markerRect.width && !markerRect.height) return undefined
  return new DOMRect(
    markerRect.left - element.scrollLeft,
    markerRect.top - element.scrollTop,
    1,
    lineHeight,
  )
}

function firstUsableRect(range: Range): DOMRect | undefined {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  )
  return rects[rects.length - 1] ?? undefined
}

function isInsideAllowedSurface(target: Node | null) {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  return Boolean(element?.closest(allowedSurfaceSelector))
}
