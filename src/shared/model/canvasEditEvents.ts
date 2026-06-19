export const CANVAS_COMMIT_ACTIVE_EDIT_EVENT = 'canvas:commit-active-edit'

export function dispatchCanvasCommitActiveEdit() {
  window.dispatchEvent(new Event(CANVAS_COMMIT_ACTIVE_EDIT_EVENT))
}

export function subscribeCanvasCommitActiveEdit(handler: () => void) {
  window.addEventListener(CANVAS_COMMIT_ACTIVE_EDIT_EVENT, handler)
  return () => window.removeEventListener(CANVAS_COMMIT_ACTIVE_EDIT_EVENT, handler)
}
