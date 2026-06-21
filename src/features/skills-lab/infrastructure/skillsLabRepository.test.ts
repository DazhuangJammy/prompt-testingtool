import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import type { SkillGraph, SkillLabMessage, SkillTopic } from '@/shared/types'
import { skillsLabRepository } from './skillsLabRepository'

vi.mock('@/shared/storage/db', () => ({
  db: {
    skillTopics: {
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      update: vi.fn(),
    },
    skillLabMessages: {
      add: vi.fn(),
      bulkAdd: vi.fn(),
      update: vi.fn(),
      where: vi.fn(),
    },
    skillAnalysisSnapshots: {
      add: vi.fn(),
      where: vi.fn(),
    },
    skillsLabSettings: {
      get: vi.fn(),
      put: vi.fn(),
    },
    transaction: vi.fn(async (_mode, _tables, callback) => callback()),
  },
}))

const topic: SkillTopic = {
  id: 'topic',
  title: 'Topic',
  skillPath: '/skills/demo',
  createdAt: 'now',
  updatedAt: 'now',
}

const graph: SkillGraph = {
  skill: {
    name: 'demo',
    description: 'Demo',
    sourcePath: '/skills/demo',
  },
  summary: 'summary',
  nodes: [],
  edges: [],
  issues: [],
  testSuggestions: [],
  generatedAt: 'now',
}

function deleteQuery() {
  return {
    equals: vi.fn(() => ({
      delete: vi.fn(),
      sortBy: vi.fn(async () => []),
      toArray: vi.fn(async () => []),
    })),
  }
}

describe('skillsLabRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.skillTopics.toArray).mockResolvedValue([])
    vi.mocked(db.skillTopics.get).mockResolvedValue(topic)
    vi.mocked(db.skillLabMessages.where).mockReturnValue(deleteQuery() as never)
    vi.mocked(db.skillAnalysisSnapshots.where).mockReturnValue(deleteQuery() as never)
  })

  it('creates, renames, binds, unbinds and deletes topics without touching local files', async () => {
    await skillsLabRepository.createTopic(undefined, '/skills/demo')
    await skillsLabRepository.renameTopic('topic', 'Next')
    await skillsLabRepository.bindSkillPath('topic', '/skills/demo')
    await skillsLabRepository.removeSkillBinding('topic')
    await skillsLabRepository.deleteTopicCascade('topic')

    expect(db.skillTopics.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'demo',
        skillPath: '/skills/demo',
      }),
    )
    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({ title: 'Next' }),
    )
    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({
        skillPath: '/skills/demo',
        agentSessionId: topic.agentSessionId,
      }),
    )
    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({
        skillPath: undefined,
        agentSessionId: undefined,
        graph: undefined,
      }),
    )
    expect(db.skillTopics.delete).toHaveBeenCalledWith('topic')
  })

  it('clears the fixed agent session when rebinding to another skill path', async () => {
    vi.mocked(db.skillTopics.get).mockResolvedValue({
      ...topic,
      agentSessionId: 'session',
    })

    await skillsLabRepository.bindSkillPath('topic', '/skills/other')

    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({
        skillPath: '/skills/other',
        agentSessionId: undefined,
      }),
    )
  })

  it('saves analysis and appends a snapshot', async () => {
    await skillsLabRepository.saveAnalysis('topic', graph, 'sig')

    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({
        graph,
        lastFileSignature: 'sig',
        status: 'idle',
      }),
    )
    expect(db.skillAnalysisSnapshots.add).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: 'topic',
        graph,
        fileSignature: 'sig',
      }),
    )
  })

  it('saves analysis with topic updates in one transaction', async () => {
    await skillsLabRepository.saveAnalysisWithTopicUpdates('topic', graph, 'sig', {
      agentSessionId: 'session',
    })

    expect(db.skillTopics.update).toHaveBeenCalledWith(
      'topic',
      expect.objectContaining({
        agentSessionId: 'session',
        graph,
        lastFileSignature: 'sig',
        status: 'idle',
      }),
    )
    expect(db.skillAnalysisSnapshots.add).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: 'topic',
        graph,
        fileSignature: 'sig',
      }),
    )
  })

  it('adds and lists messages', async () => {
    const message: Omit<SkillLabMessage, 'id' | 'createdAt'> = {
      topicId: 'topic',
      role: 'user',
      kind: 'question',
      content: 'hello',
    }

    await skillsLabRepository.addMessage(message)
    await skillsLabRepository.updateMessage('message', { status: 'complete' })
    await skillsLabRepository.listMessages('topic')
    await skillsLabRepository.clearMessages('topic')

    expect(db.skillLabMessages.add).toHaveBeenCalledWith(
      expect.objectContaining(message),
    )
    expect(db.skillLabMessages.update).toHaveBeenCalledWith('message', {
      status: 'complete',
    })
    expect(db.skillLabMessages.where).toHaveBeenCalledWith('topicId')
  })

  it('reads default settings without writing inside live queries', async () => {
    vi.mocked(db.skillsLabSettings.get).mockResolvedValue(undefined)

    const settings = await skillsLabRepository.getSettings()

    expect(settings.defaultTool).toBe('codex')
    expect(db.skillsLabSettings.put).not.toHaveBeenCalled()
  })

  it('initializes and saves normalized settings explicitly', async () => {
    vi.mocked(db.skillsLabSettings.get).mockResolvedValue(undefined)

    await skillsLabRepository.ensureSettings()
    const settings = await skillsLabRepository.getSettings()
    await skillsLabRepository.saveSettings({ ...settings, toolCommand: '  ' })

    expect(settings.defaultTool).toBe('codex')
    expect(db.skillsLabSettings.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'skills-lab' }),
    )
  })
})
