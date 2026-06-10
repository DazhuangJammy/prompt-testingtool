import { describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { chatRepository } from './chatRepository'

vi.mock('@/shared/storage/db', () => ({
  db: {
    chatMessages: { add: vi.fn(), update: vi.fn(), where: vi.fn() },
    chatSessions: { add: vi.fn(), update: vi.fn(), where: vi.fn() },
    compareRuns: { add: vi.fn(), where: vi.fn() },
    promptVersions: { add: vi.fn(), where: vi.fn() },
  },
}))

const query = {
  delete: vi.fn(() => 0),
  equals: vi.fn(() => query),
  filter: vi.fn(() => query),
  reverse: vi.fn(() => query),
  sortBy: vi.fn(() => []),
}

describe('chat repository', () => {
  it('delegates persistence to Dexie tables', async () => {
    await chatRepository.addMessage({ id: 'm' } as never)
    await chatRepository.createSession({ id: 's' } as never)
    await chatRepository.saveCompareRun({ id: 'c' } as never)
    await chatRepository.savePromptVersion({ id: 'v' } as never)
    await chatRepository.updateSessionAfterReply('s', 'long title')

    expect(db.chatMessages.add).toHaveBeenCalled()
    expect(db.chatSessions.add).toHaveBeenCalled()
    expect(db.compareRuns.add).toHaveBeenCalled()
    expect(db.promptVersions.add).toHaveBeenCalled()
    expect(db.chatSessions.update).toHaveBeenCalledWith('s', expect.any(Object))
  })

  it('updates and deletes chat message records', async () => {
    vi.mocked(db.chatMessages.where).mockReturnValue(query as never)

    await chatRepository.clearMessages('session')
    await chatRepository.updateMessageContent('message', 'updated')
    await chatRepository.updateAssistantMessage('assistant', {
      content: 'stream',
      thinkingDurationMs: 1200,
    })
    await chatRepository.deleteMessagesAfter(
      'session',
      '2026-01-01T00:00:00.000Z',
    )

    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(db.chatMessages.update).toHaveBeenCalledWith('message', {
      content: 'updated',
    })
    expect(db.chatMessages.update).toHaveBeenCalledWith('assistant', {
      content: 'stream',
      thinkingDurationMs: 1200,
    })
    expect(query.filter).toHaveBeenCalledWith(expect.any(Function))
    expect(query.delete).toHaveBeenCalledTimes(2)
  })

  it('falls back to default session title for blank replies', async () => {
    await chatRepository.updateSessionAfterReply('s', '')

    expect(db.chatSessions.update).toHaveBeenCalledWith('s', {
      updatedAt: expect.any(String),
      title: '测试',
    })
  })

  it('queries chat records through indexed fields', async () => {
    vi.mocked(db.chatSessions.where).mockReturnValue(query as never)
    vi.mocked(db.chatMessages.where).mockReturnValue(query as never)
    vi.mocked(db.promptVersions.where).mockReturnValue(query as never)
    vi.mocked(db.compareRuns.where).mockReturnValue(query as never)

    await chatRepository.listSessionsByPromptCard('card')
    await chatRepository.listMessagesBySession('session')
    await chatRepository.listVersionsByPromptCard('card')
    await chatRepository.listCompareRunsByPromptCard('card')

    expect(db.chatSessions.where).toHaveBeenCalledWith('promptCardId')
    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(db.promptVersions.where).toHaveBeenCalledWith('promptCardId')
    expect(db.compareRuns.where).toHaveBeenCalledWith('promptCardId')
  })
})
