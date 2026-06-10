import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import {
  addPromptCardToCanvas,
  createNextCanvas,
  createWorkspaceExport,
  deleteCanvasAndPickNext,
  importWorkspaceFile,
} from './workspaceService'
import type { Canvas, ExportPayload } from '@/shared/types'

vi.mock('@/features/workspace/infrastructure/workspaceRepository', () => ({
  workspaceRepository: {
    createCanvas: vi.fn(),
    createPromptCard: vi.fn(),
    deleteCanvasCascade: vi.fn(),
    exportWorkspace: vi.fn(),
    importWorkspace: vi.fn(),
    listCanvasesByUpdatedAt: vi.fn(),
  },
}))

const canvases: Canvas[] = [
  { id: 'a', title: 'A', createdAt: '1', updatedAt: '1' },
  { id: 'b', title: 'B', createdAt: '2', updatedAt: '2' },
]

describe('workspace service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the next canvas with a sequential title', async () => {
    vi.mocked(workspaceRepository.createCanvas).mockResolvedValue(canvases[0])

    await createNextCanvas(canvases)

    expect(workspaceRepository.createCanvas).toHaveBeenCalledWith('画布 3')
  })

  it('does not create prompt card without a canvas id', async () => {
    await expect(addPromptCardToCanvas(undefined, [])).resolves.toBeUndefined()
    expect(workspaceRepository.createPromptCard).not.toHaveBeenCalled()
  })

  it('creates prompt card with canvas id', async () => {
    vi.mocked(workspaceRepository.createPromptCard).mockResolvedValue({
      id: 'card',
      canvasId: 'a',
      title: 'T',
      position: { x: 0, y: 0 },
      sections: {},
      createdAt: '1',
      updatedAt: '1',
    })

    await expect(addPromptCardToCanvas('a', [])).resolves.toMatchObject({
      id: 'card',
    })
    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith(
      'a',
      0,
      undefined,
    )
  })

  it('creates prompt card at a requested canvas position', async () => {
    await addPromptCardToCanvas('a', [], { x: 24, y: 36 })

    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith('a', 0, {
      x: 24,
      y: 36,
    })
  })

  it('deletes canvas and returns the next active id', async () => {
    await expect(deleteCanvasAndPickNext('a', canvases)).resolves.toBe('b')
    expect(workspaceRepository.deleteCanvasCascade).toHaveBeenCalledWith('a')
  })

  it('returns undefined after deleting the last canvas', async () => {
    await expect(deleteCanvasAndPickNext('a', [canvases[0]])).resolves.toBeUndefined()
  })

  it('imports workspace file and returns newest canvas id', async () => {
    const payload = { version: 1, canvases: [] } as unknown as ExportPayload
    const file = new File([JSON.stringify(payload)], 'data.json')
    vi.mocked(workspaceRepository.listCanvasesByUpdatedAt).mockResolvedValue([
      canvases[1],
    ])

    await expect(importWorkspaceFile(file)).resolves.toBe('b')
    expect(workspaceRepository.importWorkspace).toHaveBeenCalledWith(payload)
  })

  it('creates export file payload', async () => {
    vi.mocked(workspaceRepository.exportWorkspace).mockResolvedValue({
      version: 2,
      exportedAt: 'now',
      canvases,
      promptCards: [],
      promptVersions: [],
      providerConfigs: [],
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    })

    const result = await createWorkspaceExport()

    expect(result.filename).toMatch(/^prompt-canvas-\d{4}-\d{2}-\d{2}.json$/)
    expect(JSON.parse(result.text).canvases).toHaveLength(2)
  })
})
