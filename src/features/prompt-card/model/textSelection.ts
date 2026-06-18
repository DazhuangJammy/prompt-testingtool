export interface TextSelectionRange {
  start: number
  end: number
  text: string
}

export function createTextSelection(
  value: string,
  start: number | null | undefined,
  end: number | null | undefined,
): TextSelectionRange | undefined {
  if (start === undefined || start === null || end === undefined || end === null) {
    return undefined
  }
  if (end <= start) return undefined

  return {
    start,
    end,
    text: value.slice(start, end),
  }
}

export function replaceTextSelection(
  value: string,
  selection: Pick<TextSelectionRange, 'start' | 'end'>,
  replacement: string,
) {
  return `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`
}
