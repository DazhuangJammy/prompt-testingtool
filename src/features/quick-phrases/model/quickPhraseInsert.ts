export interface QuickPhraseInsertResult {
  value: string
  caretOffset: number
}

export function insertQuickPhraseAtCaret(
  currentValue: string,
  insertText: string,
  selectionStart: number | undefined | null,
  selectionEnd: number | undefined | null,
): QuickPhraseInsertResult {
  const start = clampOffset(selectionStart ?? currentValue.length, currentValue.length)
  const end = clampOffset(selectionEnd ?? start, currentValue.length)
  const rangeStart = Math.min(start, end)
  const rangeEnd = Math.max(start, end)

  return {
    value:
      currentValue.slice(0, rangeStart) +
      insertText +
      currentValue.slice(rangeEnd),
    caretOffset: rangeStart + insertText.length,
  }
}

function clampOffset(offset: number, length: number) {
  return Math.max(0, Math.min(offset, length))
}
