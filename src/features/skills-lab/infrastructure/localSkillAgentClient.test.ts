import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SkillLabMessage, SkillTopic, SkillsLabSettings } from '@/shared/types'
import {
  analyzeSkillWithLocalAgent,
  askSkillAgent,
  createSkillWithLocalAgent,
  getLocalSkillFileSignature,
  getLocalSkillStatus,
  getSkillAgentToolLabel,
  listLocalSkills,
  openLocalSkillFolder,
  pickLocalSkillFolder,
  runSkillAgentTask,
  streamAnalyzeSkillWithLocalAgent,
} from './localSkillAgentClient'

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

const topic: SkillTopic = {
  id: 'topic',
  title: 'Topic',
  skillPath: '/skills/demo',
  createdAt: 'now',
  updatedAt: 'now',
}

const message: SkillLabMessage = {
  id: 'message',
  topicId: 'topic',
  role: 'user',
  kind: 'question',
  content: '怎么触发？',
  createdAt: 'now',
}

describe('local skill agent client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists local skills through the local API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          skills: [{ name: 'demo', path: '/skills/demo', hasSkillMarkdown: true }],
        }),
        { status: 200 },
      ),
    )

    await expect(listLocalSkills('/skills')).resolves.toEqual([
      { name: 'demo', path: '/skills/demo', hasSkillMarkdown: true },
    ])
    expect(fetch).toHaveBeenCalledWith(
      '/api/skills/list',
      expect.objectContaining({ body: JSON.stringify({ directory: '/skills' }) }),
    )
  })

  it('calls analyze, ask, task, status, create, and folder endpoints', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input) => {
        const payload =
          input === '/api/skills/pick-folder'
            ? { path: '/skills/demo' }
            : {
                answer: 'ok',
                fileSignature: 'sig',
                files: [{ path: 'SKILL.md', size: 10, mtimeMs: 1 }],
              }
        return new Response(JSON.stringify(payload), { status: 200 })
      },
    )

    await analyzeSkillWithLocalAgent(topic, settings)
    await askSkillAgent(topic, settings, message)
    await runSkillAgentTask(topic, settings, 'test', 'run')
    await expect(getLocalSkillFileSignature('/skills/demo')).resolves.toBe('sig')
    await expect(getLocalSkillStatus('/skills/demo')).resolves.toEqual({
      fileSignature: 'sig',
      files: [{ path: 'SKILL.md', size: 10, mtimeMs: 1 }],
    })
    await createSkillWithLocalAgent(settings, 'create')
    await openLocalSkillFolder('/skills/demo')
    await expect(pickLocalSkillFolder()).resolves.toBe('/skills/demo')

    expect(vi.mocked(fetch).mock.calls.map((call) => call[0])).toEqual([
      '/api/skills/analyze',
      '/api/skills/ask',
      '/api/skills/task',
      '/api/skills/status',
      '/api/skills/status',
      '/api/skills/create',
      '/api/skills/open-folder',
      '/api/skills/pick-folder',
    ])
  })

  it('throws API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad' }), { status: 400 }),
    )

    await expect(listLocalSkills('/missing')).rejects.toThrow('bad')
  })

  it('reads streaming agent events and returns the final result', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            [
              JSON.stringify({
                type: 'session',
                sessionId: 'session',
              }),
              JSON.stringify({
                type: 'output',
                stream: 'stdout',
                text: 'running',
              }),
              JSON.stringify({
                type: 'result',
                result: { answer: 'done', agentSessionId: 'session' },
              }),
              '',
            ].join('\n'),
          ),
        )
        controller.close()
      },
    })
    const onEvent = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, { status: 200 }),
    )

    await expect(
      streamAnalyzeSkillWithLocalAgent(topic, settings, onEvent),
    ).resolves.toEqual({ answer: 'done', agentSessionId: 'session' })

    expect(onEvent).toHaveBeenCalledWith({
      type: 'session',
      sessionId: 'session',
    })
    expect(onEvent).toHaveBeenCalledWith({
      type: 'output',
      stream: 'stdout',
      text: 'running',
    })
  })

  it('throws streaming agent errors after forwarding the event', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(
          encoder.encode(
            [
              JSON.stringify({
                type: 'error',
                error: 'stream bad',
              }),
              '',
            ].join('\n'),
          ),
        )
        controller.close()
      },
    })
    const onEvent = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, { status: 200 }),
    )

    await expect(
      streamAnalyzeSkillWithLocalAgent(topic, settings, onEvent),
    ).rejects.toThrow('stream bad')
    expect(onEvent).toHaveBeenCalledWith({
      type: 'error',
      error: 'stream bad',
    })
  })

  it('throws non-ok streaming responses with the API error when present', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'api bad' }), { status: 500 }),
    )

    await expect(
      streamAnalyzeSkillWithLocalAgent(topic, settings, vi.fn()),
    ).rejects.toThrow('api bad')
  })

  it('uses fallback messages for malformed error payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not-json', { status: 500 }),
    )

    await expect(listLocalSkills('/missing')).rejects.toThrow(
      '读取 Skills 目录失败',
    )
    await expect(getLocalSkillFileSignature('/missing')).rejects.toThrow(
      '读取 Skill 文件状态失败',
    )
    await expect(createSkillWithLocalAgent(settings, 'create')).rejects.toThrow(
      '新建 Skill 失败',
    )
    await expect(analyzeSkillWithLocalAgent(topic, settings)).rejects.toThrow(
      '本地 agent 调用失败',
    )
    await expect(pickLocalSkillFolder()).rejects.toThrow('选择本地文件夹失败')
  })

  it('labels supported local tools', () => {
    expect(getSkillAgentToolLabel('codex')).toBe('Codex')
    expect(getSkillAgentToolLabel('claude-code')).toBe('Claude Code')
    expect(getSkillAgentToolLabel('openclaw')).toBe('OpenClaw')
    expect(getSkillAgentToolLabel('mock')).toBe('Mock')
  })
})
