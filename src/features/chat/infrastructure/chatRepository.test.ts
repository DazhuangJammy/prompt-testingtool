import { describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { chatRepository } from './chatRepository'

vi.mock('@/shared/storage/db', () => ({
  db: {
    chatMessages: { add: vi.fn(), update: vi.fn(), where: vi.fn() },
    chatSessions: {
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      reverse: vi.fn(() => ({ sortBy: vi.fn(() => []) })),
      update: vi.fn(),
      where: vi.fn(),
    },
    compareRuns: { add: vi.fn(), where: vi.fn() },
    promptCards: { where: vi.fn() },
    promptVersions: { add: vi.fn(), where: vi.fn() },
  },
}))

const query = {
  anyOf: vi.fn(() => query),
  toArray: vi.fn(() => []),
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
    await chatRepository.updateSessionAfterReply('s', 'card')

    expect(db.chatMessages.add).toHaveBeenCalled()
    expect(db.chatSessions.add).toHaveBeenCalled()
    expect(db.compareRuns.add).toHaveBeenCalled()
    expect(db.promptVersions.add).toHaveBeenCalled()
    expect(db.chatSessions.update).toHaveBeenCalledWith(
      's',
      expect.objectContaining({ promptCardId: 'card', updatedAt: expect.any(String) }),
    )
  })

  it('updates and deletes chat message records', async () => {
    vi.mocked(db.chatMessages.where).mockReturnValue(query as never)

    await chatRepository.clearMessages('session')
    await chatRepository.updateMessageContent('message', 'updated')
    await chatRepository.updateSessionTitle('session', '  话题  ')
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
    expect(db.chatSessions.update).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({ title: '话题' }),
    )
    expect(db.chatMessages.update).toHaveBeenCalledWith('assistant', {
      content: 'stream',
      thinkingDurationMs: 1200,
    })
    expect(query.filter).toHaveBeenCalledWith(expect.any(Function))
    expect(query.delete).toHaveBeenCalledTimes(2)
  })

  it('deletes a session with its messages', async () => {
    vi.mocked(db.chatMessages.where).mockReturnValue(query as never)

    await chatRepository.deleteSessionCascade('session')

    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(query.delete).toHaveBeenCalled()
    expect(db.chatSessions.delete).toHaveBeenCalledWith('session')
  })

  it('reads a chat session by id', async () => {
    vi.mocked(db.chatSessions.get).mockResolvedValue({ id: 's' } as never)

    await expect(chatRepository.getSession('s')).resolves.toEqual({ id: 's' })
    expect(db.chatSessions.get).toHaveBeenCalledWith('s')
  })

  it('queries chat records through indexed fields', async () => {
    vi.mocked(db.chatSessions.where).mockReturnValue(query as never)
    vi.mocked(db.chatMessages.where).mockReturnValue(query as never)
    vi.mocked(db.promptCards.where).mockReturnValue(query as never)
    vi.mocked(db.promptVersions.where).mockReturnValue(query as never)
    vi.mocked(db.compareRuns.where).mockReturnValue(query as never)

    await chatRepository.listSessionsByPromptCard('card')
    await chatRepository.listSessionsByCanvas('canvas')
    await chatRepository.listSessionsByUpdatedAt()
    await chatRepository.listMessagesBySession('session')
    await chatRepository.listVersionsByPromptCard('card')
    await chatRepository.listCompareRunsByPromptCard('card')

    expect(db.chatSessions.where).toHaveBeenCalledWith('promptCardId')
    expect(db.chatSessions.where).toHaveBeenCalledWith('canvasId')
    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(db.promptVersions.where).toHaveBeenCalledWith('promptCardId')
    expect(db.compareRuns.where).toHaveBeenCalledWith('promptCardId')
  })
})
