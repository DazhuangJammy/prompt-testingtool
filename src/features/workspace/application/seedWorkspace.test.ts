import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import { ensureSeedData } from './seedWorkspace'

vi.mock('@/features/workspace/infrastructure/workspaceRepository', () => ({
  workspaceRepository: {
    createCanvas: vi.fn(),
    createPromptCard: vi.fn(),
    listCanvasesByUpdatedAt: vi.fn(),
    updateCanvas: vi.fn(),
  },
}))

describe('seed workspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when canvases exist', async () => {
    vi.mocked(workspaceRepository.listCanvasesByUpdatedAt).mockResolvedValue([
      { id: 'existing', title: 'Existing', createdAt: '1', updatedAt: '1' },
    ])

    await ensureSeedData()

    expect(workspaceRepository.createCanvas).not.toHaveBeenCalled()
  })

  it('creates default canvas and prompt when empty', async () => {
    vi.mocked(workspaceRepository.listCanvasesByUpdatedAt).mockResolvedValue([])
    vi.mocked(workspaceRepository.createCanvas).mockResolvedValue({
      id: 'canvas',
      title: '工作台',
      createdAt: '1',
      updatedAt: '1',
    })
    vi.mocked(workspaceRepository.createPromptCard).mockResolvedValue({
      id: 'card',
      canvasId: 'canvas',
      title: '新提示词',
      position: { x: 0, y: 0 },
      sections: {},
      createdAt: '2',
      updatedAt: '2',
    })

    await ensureSeedData()

    expect(workspaceRepository.createCanvas).toHaveBeenCalledWith('工作台')
    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith('canvas', 0)
    expect(workspaceRepository.updateCanvas).toHaveBeenCalledWith('canvas', {
      updatedAt: '2',
    })
  })
})
