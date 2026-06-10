import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'

export async function ensureSeedData() {
  const count = await workspaceRepository.listCanvasesByUpdatedAt()
  if (count.length > 0) return

  const canvas = await workspaceRepository.createCanvas('工作台')
  const card = await workspaceRepository.createPromptCard(canvas.id, 0)
  await workspaceRepository.updateCanvas(canvas.id, { updatedAt: card.updatedAt })
}
