import { describe, expect, it, vi } from 'vitest'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { reorderChatTopics } from './chatService'

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    updateSessionSortOrders: vi.fn(),
  },
}))

const topic = (id: string, sortOrder: number) => ({
  id,
  title: id,
  sortOrder,
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
})

describe('chat topic reorder service', () => {
  it('persists reordered topic sort orders', async () => {
    await reorderChatTopics([topic('one', 1), topic('two', 2)], 'two', 'one')

    expect(chatRepository.updateSessionSortOrders).toHaveBeenCalledWith([
      { id: 'two', sortOrder: 1 },
      { id: 'one', sortOrder: 2 },
    ])
  })
})
