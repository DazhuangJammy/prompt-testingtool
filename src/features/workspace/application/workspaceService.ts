import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import type {
  Canvas,
  ChatTopicExportPayload,
  ExportPayload,
  PromptCard,
} from '@/shared/types'

export async function createNextCanvas(canvases: Canvas[]) {
  return workspaceRepository.createCanvas(`画布 ${canvases.length + 1}`)
}

export async function addPromptCardToCanvas(
  canvasId: string | undefined,
  promptCards: PromptCard[],
  position?: PromptCard['position'],
) {
  if (!canvasId) return undefined
  return workspaceRepository.createPromptCard(canvasId, promptCards.length, position)
}

export async function deleteCanvasAndPickNext(id: string, canvases: Canvas[]) {
  const remaining = canvases.filter((canvas) => canvas.id !== id)
  await workspaceRepository.deleteCanvasCascade(id)
  return remaining[0]?.id
}

export async function importWorkspaceFile(file: File) {
  const text = await file.text()
  await workspaceRepository.importWorkspace(JSON.parse(text) as ExportPayload)
  const nextCanvases = await workspaceRepository.listCanvasesByUpdatedAt()
  return nextCanvases[0]?.id
}

export async function createWorkspaceExport() {
  const payload = await workspaceRepository.exportWorkspace()
  return {
    filename: `prompt-canvas-${new Date().toISOString().slice(0, 10)}.json`,
    text: JSON.stringify(payload, null, 2),
  }
}

export async function createChatTopicExport(sessionId: string) {
  const payload = await workspaceRepository.exportChatTopic(sessionId)
  return {
    filename: `prompt-topic-${safeFilename(payload.chatSession.title)}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`,
    text: JSON.stringify(payload, null, 2),
  }
}

export async function importChatTopicFile(file: File, targetCanvasId?: string) {
  const text = await file.text()
  const payload = JSON.parse(text) as ChatTopicExportPayload
  return workspaceRepository.importChatTopic(payload, targetCanvasId)
}

function safeFilename(value: string) {
  return (value.trim() || 'topic')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 42)
}
