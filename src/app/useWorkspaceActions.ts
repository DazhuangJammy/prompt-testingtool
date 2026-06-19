import {
  addPromptCardToCanvas,
  createChatTopicExport,
  createNextCanvas,
  createWorkspaceExport,
  deleteCanvasAndPickNext,
  importChatTopicFile,
  importWorkspaceFile,
} from '@/features/workspace/application/workspaceService'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import type { Canvas, PromptCard } from '@/shared/types'

interface WorkspaceActionOptions {
  canvases: Canvas[]
  effectiveCanvasId?: string
  promptCards: PromptCard[]
  selectedCardId?: string
  setActiveCanvasId: (id?: string) => void
  setSelectedCardId: (id?: string) => void
}

export function useWorkspaceActions({
  canvases,
  effectiveCanvasId,
  promptCards,
  selectedCardId,
  setActiveCanvasId,
  setSelectedCardId,
}: WorkspaceActionOptions) {
  const updateCanvas = async (id: string, updates: Partial<Canvas>) => {
    await workspaceRepository.updateCanvas(id, updates)
  }

  const createCanvas = async () => {
    const canvas = await createNextCanvas(canvases)
    setActiveCanvasId(canvas.id)
  }

  const deletePromptCard = async (id: string) => {
    await workspaceRepository.deletePromptCardCascade(id)
    if (selectedCardId === id) setSelectedCardId(undefined)
  }

  const deleteCanvas = async (id: string) => {
    setActiveCanvasId(await deleteCanvasAndPickNext(id, canvases))
  }

  const addPromptCard = async (position?: PromptCard['position']) => {
    const card = await addPromptCardToCanvas(
      effectiveCanvasId,
      promptCards,
      position,
    )
    if (card) setSelectedCardId(card.id)
  }

  const downloadExportFile = (exportFile: { filename: string; text: string }) => {
    const blob = new Blob([exportFile.text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = exportFile.filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportWorkspace = async () => {
    downloadExportFile(await createWorkspaceExport())
  }

  const exportChatTopic = async (sessionId?: string) => {
    if (!sessionId) throw new Error('请选择要导出的话题')
    downloadExportFile(await createChatTopicExport(sessionId))
  }

  const importWorkspace = async (file: File) => {
    setActiveCanvasId(await importWorkspaceFile(file))
    setSelectedCardId(undefined)
  }

  const importChatTopic = async (file: File, targetCanvasId?: string) => {
    const result = await importChatTopicFile(file, targetCanvasId)
    setActiveCanvasId(result.canvasId)
    setSelectedCardId(undefined)
    return result
  }

  return {
    addPromptCard,
    createNextCanvas: createCanvas,
    deleteCanvas,
    deletePromptCard,
    exportChatTopic,
    exportWorkspace,
    importChatTopic,
    importWorkspace,
    updateCanvas,
  }
}
