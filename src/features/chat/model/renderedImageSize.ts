export interface RenderedImageSize {
  height: number
  width: number
}

export function fitImageSize(
  size: RenderedImageSize,
  maxWidth: number,
  maxHeight: number,
): RenderedImageSize {
  const safeWidth = Math.max(1, size.width)
  const safeHeight = Math.max(1, size.height)
  const scale = Math.min(1, maxWidth / safeWidth, maxHeight / safeHeight)

  return {
    height: Math.max(1, Math.round(safeHeight * scale)),
    width: Math.max(1, Math.round(safeWidth * scale)),
  }
}

export function getSvgIntrinsicSize(svg: string): RenderedImageSize | undefined {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  if (root.nodeName.toLowerCase() !== 'svg') return undefined

  const width = readSvgNumber(root.getAttribute('width'))
  const height = readSvgNumber(root.getAttribute('height'))
  if (width && height) return { height, width }

  const viewBox = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (viewBox?.length === 4 && viewBox.every((value) => Number.isFinite(value))) {
    const [, , viewBoxWidth, viewBoxHeight] = viewBox
    if (viewBoxWidth > 0 && viewBoxHeight > 0) {
      return { height: viewBoxHeight, width: viewBoxWidth }
    }
  }

  return undefined
}

function readSvgNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}
