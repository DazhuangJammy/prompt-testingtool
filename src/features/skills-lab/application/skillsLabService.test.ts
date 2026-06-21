import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SkillGraph, SkillTopic, SkillsLabSettings } from '@/shared/types'
import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import {
  createSkillWithLocalAgent,
  streamAnalyzeSkillWithLocalAgent,
  streamAskSkillAgent,
  streamSkillAgentTask,
} from '@/features/skills-lab/infrastructure/localSkillAgentClient'
import {
  analyzeSkillTopic,
  bindSkillPath,
  createSkillTopic,
  deleteSkillTopic,
  duplicateSkillTopic,
  createSkillForTopic,
  removeSkillBinding,
  renameSkillTopic,
  reorderSkillTopics,
  sendSkillLabMessage,
} from './skillsLabService'

vi.mock('@/features/skills-lab/infrastructure/skillsLabRepository', () => ({
  skillsLabRepository: {
    addMessage: vi.fn(),
    bindSkillPath: vi.fn(),
    createTopic: vi.fn(),
    deleteTopicCascade: vi.fn(),
    duplicateTopic: vi.fn(),
    removeSkillBinding: vi.fn(),
    renameTopic: vi.fn(),
    saveAnalysis: vi.fn(),
    saveAnalysisWithTopicUpdates: vi.fn(),
    updateMessage: vi.fn(),
    updateTopicSortOrders: vi.fn(),
    updateTopic: vi.fn(),
  },
}))

vi.mock('@/features/skills-lab/infrastructure/localSkillAgentClient', () => ({
  createSkillWithLocalAgent: vi.fn(),
  runSkillAgentTask: vi.fn(),
  streamAnalyzeSkillWithLocalAgent: vi.fn(),
  streamAskSkillAgent: vi.fn(),
  streamSkillAgentTask: vi.fn(),
}))

const topic: SkillTopic = {
  id: 'topic',
  title: 'Topic',
  skillPath: '/skills/demo',
  createdAt: 'now',
  updatedAt: 'now',
}

const settings: SkillsLabSettings = {
  id: 'skills-lab',
  defaultTool: 'codex',
  toolCommand: 'codex',
  defaultSkillsDirectory: '/skills',
  autoRunChecks: false,
  requireChangeConfirmation: true,
  permissionMode: 'read-only',
  createdAt: 'now',
  updatedAt: 'now',
}

const graph: SkillGraph = {
  skill: {
    name: 'demo',
    description: 'Demo',
    sourcePath: '/skills/demo',
    sourceFile: 'SKILL.md',
  },
  summary: 'summary',
  nodes: [],
  edges: [],
  issues: [],
  testSuggestions: [],
  generatedAt: 'now',
}

describe('skillsLabService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(skillsLabRepository.addMessage).mockImplementation(
      async (message) => ({
        id: crypto.randomUUID(),
        createdAt: 'now',
        ...message,
      }),
    )
  })

  it('analyzes a topic and saves the returned graph snapshot', async () => {
    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockImplementation(
      async (_topic, _settings, onEvent) => {
        await onEvent({ type: 'session', sessionId: 'session' })
        await onEvent({ type: 'output', stream: 'stdout', text: 'reading\n' })
        return {
          graph,
          fileSignature: 'sig',
          agentSessionId: 'session',
        }
      },
    )

    await expect(analyzeSkillTopic(topic, settings)).resolves.toBe(graph)

    expect(skillsLabRepository.updateTopic).toHaveBeenCalledWith(topic.id, {
      status: 'analyzing',
      error: undefined,
    })
    expect(skillsLabRepository.updateTopic).toHaveBeenCalledWith(topic.id, {
      agentSessionId: 'session',
    })
    expect(skillsLabRepository.saveAnalysisWithTopicUpdates).toHaveBeenCalledWith(
      topic.id,
      graph,
      'sig',
      { agentSessionId: 'session' },
    )
    expect(skillsLabRepository.updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ agentSessionId: 'session' }),
    )
    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'reading',
        format: 'terminal',
        status: 'complete',
        stream: 'stdout',
      }),
    )
    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'analysis',
        content: 'summary',
      }),
    )
  })

  it('marks terminal and topic as error when analysis streaming fails', async () => {
    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockImplementation(
      async (_topic, _settings, onEvent) => {
        await onEvent({ type: 'error', error: 'bad' })
        throw new Error('bad')
      },
    )

    await expect(analyzeSkillTopic(topic, settings)).rejects.toThrow('bad')

    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'ERROR: bad',
        format: 'terminal',
        status: 'error',
        stream: 'stderr',
      }),
    )
    expect(skillsLabRepository.updateTopic).toHaveBeenLastCalledWith(topic.id, {
      status: 'error',
      error: 'bad',
    })
  })

  it('runs a read-only auto check when enabled after analysis', async () => {
    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockResolvedValue({
      graph,
      fileSignature: 'sig',
      agentSessionId: 'session',
    })
    vi.mocked(streamSkillAgentTask).mockResolvedValue({ answer: 'check ok' })

    await analyzeSkillTopic(topic, {
      ...settings,
      autoRunChecks: true,
      permissionMode: 'allow-write',
    })

    expect(streamSkillAgentTask).toHaveBeenCalledWith(
      expect.objectContaining({ agentSessionId: 'session' }),
      expect.objectContaining({ permissionMode: 'read-only' }),
      'test',
      expect.stringContaining('检查 SKILL.md 的触发条件是否清楚'),
      expect.any(Function),
    )
    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'test',
        content: expect.stringContaining('自动检查结果'),
      }),
    )
  })

  it('records an auto check failure without failing the saved analysis', async () => {
    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockResolvedValue({
      graph,
      fileSignature: 'sig',
      agentSessionId: 'session',
    })
    vi.mocked(streamSkillAgentTask).mockRejectedValue(new Error('check bad'))

    await expect(
      analyzeSkillTopic(topic, {
        ...settings,
        autoRunChecks: true,
      }),
    ).resolves.toBe(graph)

    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'test',
        status: 'error',
        content: '自动检查失败：check bad',
      }),
    )
  })

  it('delegates basic topic operations to the repository', async () => {
    vi.mocked(skillsLabRepository.createTopic).mockResolvedValue(topic)
    vi.mocked(skillsLabRepository.duplicateTopic).mockResolvedValue({
      ...topic,
      id: 'copy',
    })

    await expect(createSkillTopic('/skills/demo')).resolves.toBe(topic)
    await expect(duplicateSkillTopic(topic)).resolves.toMatchObject({ id: 'copy' })
    await deleteSkillTopic('topic')
    await renameSkillTopic('topic', 'Next')
    await reorderSkillTopics(
      [
        { ...topic, id: 'a', sortOrder: 1 },
        { ...topic, id: 'b', sortOrder: 2 },
      ],
      'b',
      'a',
    )
    await bindSkillPath('topic', '/skills/demo')
    await removeSkillBinding('topic')

    expect(skillsLabRepository.deleteTopicCascade).toHaveBeenCalledWith('topic')
    expect(skillsLabRepository.renameTopic).toHaveBeenCalledWith('topic', 'Next')
    expect(skillsLabRepository.updateTopicSortOrders).toHaveBeenCalledWith([
      { id: 'b', sortOrder: 1 },
      { id: 'a', sortOrder: 2 },
    ])
    expect(skillsLabRepository.bindSkillPath).toHaveBeenCalledWith(
      'topic',
      '/skills/demo',
    )
    expect(skillsLabRepository.removeSkillBinding).toHaveBeenCalledWith('topic')
  })

  it('marks the topic as error when analysis fails before streaming starts', async () => {
    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockRejectedValue(new Error('bad'))

    await expect(analyzeSkillTopic(topic, settings)).rejects.toThrow('bad')
    expect(skillsLabRepository.updateTopic).toHaveBeenLastCalledWith(topic.id, {
      status: 'error',
      error: 'bad',
    })
  })

  it('rejects missing skill paths and missing graph payloads', async () => {
    await expect(
      analyzeSkillTopic({ ...topic, skillPath: undefined }, settings),
    ).rejects.toThrow('请先选择本地 Skill 文件夹')

    vi.mocked(streamAnalyzeSkillWithLocalAgent).mockResolvedValue({})
    await expect(analyzeSkillTopic(topic, settings)).rejects.toThrow(
      '本地 agent 没有返回 Skill 图谱',
    )
  })

  it('creates a skill and binds the returned path', async () => {
    vi.mocked(createSkillWithLocalAgent).mockResolvedValue({
      answer: 'created',
      skillPath: '/skills/new-skill',
    })

    await expect(
      createSkillForTopic(topic, settings, 'create skill'),
    ).resolves.toBe('/skills/new-skill')

    expect(skillsLabRepository.bindSkillPath).toHaveBeenCalledWith(
      topic.id,
      '/skills/new-skill',
    )
    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'created' }),
    )
  })

  it('sends questions to ask endpoint and tests to task endpoint', async () => {
    vi.mocked(skillsLabRepository.addMessage).mockResolvedValue({
      id: 'message',
      topicId: topic.id,
      role: 'user',
      kind: 'question',
      content: 'q',
      createdAt: 'now',
    })
    vi.mocked(streamAskSkillAgent).mockResolvedValue({ answer: 'answer' })
    vi.mocked(streamSkillAgentTask).mockResolvedValue({ answer: 'tested' })

    await expect(sendSkillLabMessage(topic, settings, 'question', 'q')).resolves.toBe(
      'answer',
    )
    await sendSkillLabMessage(topic, settings, 'test', 'run')
    await sendSkillLabMessage(topic, settings, 'suggestion', ' improve ')
    await expect(
      sendSkillLabMessage(topic, settings, 'question', '   '),
    ).resolves.toBeUndefined()

    expect(streamAskSkillAgent).toHaveBeenCalled()
    expect(streamSkillAgentTask).toHaveBeenCalledWith(
      topic,
      settings,
      'test',
      'run',
      expect.any(Function),
    )
    expect(streamSkillAgentTask).toHaveBeenCalledWith(
      topic,
      settings,
      'suggest',
      'improve',
      expect.any(Function),
    )
  })

  it('marks the terminal message as error when a manual run fails', async () => {
    vi.mocked(skillsLabRepository.addMessage).mockResolvedValue({
      id: 'message',
      topicId: topic.id,
      role: 'user',
      kind: 'question',
      content: 'q',
      createdAt: 'now',
    })
    vi.mocked(streamAskSkillAgent).mockRejectedValue(new Error('ask bad'))

    await expect(sendSkillLabMessage(topic, settings, 'question', 'q')).rejects.toThrow(
      'ask bad',
    )

    expect(skillsLabRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'ERROR: ask bad',
        format: 'terminal',
        status: 'error',
        stream: 'stderr',
      }),
    )
    expect(skillsLabRepository.updateMessage).toHaveBeenCalledWith(
      'message',
      expect.objectContaining({
        status: 'error',
      }),
    )
  })
})
