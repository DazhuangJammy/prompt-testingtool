import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletionStream } from '@/shared/api/ai'
import { optimizeFullPrompt } from '@/features/prompt-card/application/promptOptimizationService'
import type { ProviderConfig } from '@/shared/types'
import {
  buildFlowchartGenerationMessages,
  generateFlowchartCanvasElements,
  generateFlowchartCanvasElementsStream,
  generatedPromptConcurrency,
  normalizeGeneratedFlowchart,
  parseFlowchartJson,
} from './flowchartGenerationService'

vi.mock('@/shared/api/ai', () => ({
  requestCompletionStream: vi.fn(),
}))

vi.mock('@/features/prompt-card/application/promptOptimizationService', () => ({
  optimizeFullPrompt: vi.fn(),
}))

const provider: ProviderConfig = {
  id: 'provider::model',
  sourceProviderId: 'provider',
  name: '测试模型',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'model',
  createdAt: 'now',
  updatedAt: 'now',
}

describe('flowchart generation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses fenced JSON and normalizes step titles', () => {
    const result = parseFlowchartJson(`
\`\`\`json
{
  "nodes": [
    { "id": "step 1", "kind": "step", "title": "收集需求", "body": "理解目标" },
    { "id": "step 2", "kind": "step", "title": "整理方案", "body": "输出方案" },
    { "id": "decision 1", "kind": "decision", "title": "是否完整", "body": "判断信息" }
  ],
  "edges": []
}
\`\`\`
`)

    expect(result.nodes[0]).toMatchObject({
      id: 'step-1',
      title: '【01】收集需求',
    })
    expect(result.nodes.map((node) => node.kind)).toEqual(['step', 'step'])
    expect(result.edges).toEqual([{ sourceId: 'step-1', targetId: 'step-2' }])
  })

  it('keeps every prompt node connected to one step as a chain', () => {
    const result = normalizeGeneratedFlowchart({
      nodes: [
        { id: 'step-01', kind: 'step', title: '【09】步骤', body: 'body' },
        ...Array.from({ length: 6 }, (_, index) => ({
          id: `prompt-${index + 1}`,
          kind: 'prompt',
          title: `提示词 ${index + 1}`,
          body: 'body',
          promptInstruction: 'instruction',
        })),
      ],
      edges: Array.from({ length: 6 }, (_, index) => ({
        sourceId: 'step-01',
        targetId: `prompt-${index + 1}`,
      })),
    })

    expect(result.nodes.filter((node) => node.kind === 'prompt')).toHaveLength(6)
    expect(result.nodes.filter((node) => node.kind === 'prompt')).toMatchObject([
      { id: 'prompt-1', parentStepId: 'step-01' },
      { id: 'prompt-2', parentStepId: 'step-01' },
      { id: 'prompt-3', parentStepId: 'step-01' },
      { id: 'prompt-4', parentStepId: 'step-01' },
      { id: 'prompt-5', parentStepId: 'step-01' },
      { id: 'prompt-6', parentStepId: 'step-01' },
    ])
    expect(result.edges).toEqual([
      { sourceId: 'step-01', targetId: 'prompt-1' },
      { sourceId: 'prompt-1', targetId: 'prompt-2' },
      { sourceId: 'prompt-2', targetId: 'prompt-3' },
      { sourceId: 'prompt-3', targetId: 'prompt-4' },
      { sourceId: 'prompt-4', targetId: 'prompt-5' },
      { sourceId: 'prompt-5', targetId: 'prompt-6' },
    ])
    expect(result.nodes[0].title).toBe('【01】步骤')
  })

  it('builds messages with the configured system prompt and current canvas', () => {
    const messages = buildFlowchartGenerationMessages({
      currentCanvas: '{"nodes":[]}',
      instruction: '生成一个流程',
      systemPrompt: '系统提示词',
    })

    expect(messages[0]).toMatchObject({ role: 'system', content: '系统提示词' })
    expect(messages[1].content).toContain('{"nodes":[]}')
    expect(messages[1].content).toContain('生成一个流程')
  })

  it('uses the fallback system prompt when no custom prompt is configured', () => {
    const messages = buildFlowchartGenerationMessages({
      currentCanvas: '{}',
      instruction: '生成流程',
    })

    expect(messages[0].content).toContain('流程图结构生成专家')
  })

  it('drops decision nodes, unknown nodes, duplicate edges, self edges, and invalid edge endpoints', () => {
    const result = normalizeGeneratedFlowchart({
      nodes: [
        { id: 'step', kind: 'step', title: '', body: '' },
        { id: 'step-2', kind: 'step', title: '第二步', body: '第二步说明' },
        { id: 'decision', kind: 'decision', title: '', body: '' },
        { id: 'bad', kind: 'unknown', title: 'bad', body: 'bad' },
      ],
      edges: [
        { sourceId: 'step', targetId: 'step' },
        { sourceId: 'step', targetId: 'missing' },
        { sourceId: 'step', targetId: 'decision' },
        { sourceId: 'step', targetId: 'decision' },
      ],
    })

    expect(result.nodes).toMatchObject([
      { id: 'step', kind: 'step', title: '【01】步骤', body: '执行该步骤需要完成的事项。' },
      { id: 'step-2', kind: 'step', title: '【02】第二步', body: '第二步说明' },
    ])
    expect(result.edges).toEqual([{ sourceId: 'step', targetId: 'step-2' }])
  })

  it('throws clear errors for missing input and malformed model output', async () => {
    await expect(
      generateFlowchartCanvasElements({
        canvasId: 'canvas',
        edges: [],
        flowchartProvider: provider,
        instruction: ' ',
        origin: { x: 0, y: 0 },
        promptCards: [],
        shapeNodes: [],
      }),
    ).rejects.toThrow('请输入流程图生成需求')

    expect(() => parseFlowchartJson('没有 json')).toThrow('模型没有返回 JSON')
    expect(() => normalizeGeneratedFlowchart({})).toThrow('模型没有返回 nodes')
  })

  it('materializes generated shapes, prompt cards, and edges', async () => {
    mockFlowchartStream(
      JSON.stringify({
        nodes: [
          { id: 'step-01', kind: 'step', title: '需求理解', body: '理解目标' },
          {
            id: 'prompt-01',
            kind: 'prompt',
            title: '需求分析提示词',
            body: '分析需求',
            promptInstruction: '生成需求分析提示词',
          },
          {
            id: 'prompt-02',
            kind: 'prompt',
            title: '方案输出提示词',
            body: '输出方案',
            promptInstruction: '生成方案输出提示词',
          },
          { id: 'step-02', kind: 'step', title: '方案输出', body: '输出方案' },
        ],
        edges: [
          { sourceId: 'step-01', targetId: 'prompt-01' },
          { sourceId: 'step-01', targetId: 'prompt-02' },
          { sourceId: 'step-01', targetId: 'step-02' },
        ],
      }),
    )
    vi.mocked(optimizeFullPrompt).mockResolvedValue('# 角色：\n- 你是需求分析专家')

    const result = await generateFlowchartCanvasElements({
      canvasId: 'canvas',
      edges: [],
      flowchartProvider: provider,
      flowchartSettings: {
        id: 'flowchart-model',
        assistantName: '流程图',
        prompt: '系统提示词',
        thinkingMode: 'off',
        createdAt: 'now',
        updatedAt: 'now',
      },
      instruction: '生成流程',
      origin: { x: 10, y: 20 },
      promptCards: [],
      promptOptimizationProvider: provider,
      promptOptimizationSettings: {
        id: 'default-model',
        assistantName: '提示词优化',
        prompt: '提示词优化系统',
        thinkingMode: 'off',
        createdAt: 'now',
        updatedAt: 'now',
      },
      shapeNodes: [],
      topicSessionId: 'topic',
    })

    expect(result.shapeNodes).toHaveLength(2)
    expect(result.shapeNodes[0]).toMatchObject({
      canvasId: 'canvas',
      kind: 'step',
      title: '【01】需求理解',
      topicSessionId: 'topic',
    })
    expect(result.promptCards).toHaveLength(2)
    expect(result.promptCards[0]).toMatchObject({
      canvasId: 'canvas',
      defaultCollapsed: true,
      title: '需求分析提示词',
      topicSessionId: 'topic',
    })
    expect(result.promptCards[1]).toMatchObject({
      canvasId: 'canvas',
      defaultCollapsed: true,
      title: '方案输出提示词',
      topicSessionId: 'topic',
    })
    expect(result.edges).toHaveLength(3)
    expect(result.shapeNodes[1]).toMatchObject({
      position: { x: 10, y: expect.any(Number) },
    })
    expect(result.promptCards[0].position.x).toBeGreaterThan(result.shapeNodes[0].position.x)
    expect(result.promptCards[1].position.x).toBeGreaterThan(result.promptCards[0].position.x)
    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceHandle: 'right', targetHandle: 'left' }),
        expect.objectContaining({ sourceHandle: 'bottom', targetHandle: 'top' }),
      ]),
    )
    expect(optimizeFullPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        instruction: expect.stringContaining('生成需求分析提示词'),
        provider,
        systemPrompt: '提示词优化系统',
      }),
    )
  })

  it('emits preview elements while JSON is streaming', async () => {
    const output = JSON.stringify({
      nodes: [
        {
          id: 'step-01',
          kind: 'step',
          title: '客户建档',
          body: '- 收集客户信息 - 录入需求',
        },
      ],
      edges: [],
    })
    const previews: unknown[] = []
    mockFlowchartStream(output)

    await generateFlowchartCanvasElementsStream({
      canvasId: 'canvas',
      edges: [],
      flowchartProvider: provider,
      instruction: '生成流程',
      onPreview: (preview) => previews.push(preview),
      origin: { x: 10, y: 20 },
      promptCards: [],
      shapeNodes: [],
    })

    expect(previews).toHaveLength(1)
    expect(previews[0]).toMatchObject({
      shapeNodes: [
        {
          body: '- 收集客户信息\n- 录入需求',
          height: 176,
          position: { x: 10, y: 20 },
        },
      ],
    })
  })

  it('keeps streaming preview node size stable while generated text grows', async () => {
    const output = JSON.stringify({
      nodes: [
        {
          id: 'step-01',
          kind: 'step',
          title: '客户建档',
          body: Array.from({ length: 18 }, (_, index) => `- 第 ${index + 1} 个要点`).join('\n'),
        },
      ],
      edges: [],
    })
    const previews: Array<{ shapeNodes: Array<{ height: number }> }> = []
    mockFlowchartStream(output)

    await generateFlowchartCanvasElementsStream({
      canvasId: 'canvas',
      edges: [],
      flowchartProvider: provider,
      instruction: '生成流程',
      onPreview: (preview) => previews.push(preview),
      origin: { x: 10, y: 20 },
      promptCards: [],
      shapeNodes: [],
    })

    expect(previews.at(-1)?.shapeNodes[0]?.height).toBe(176)
  })

  it('emits pending prompt cards while prompt nodes are being generated', async () => {
    mockFlowchartStream(
      JSON.stringify({
        nodes: [
          { id: 'step-01', kind: 'step', title: '需求理解', body: '理解目标' },
          {
            id: 'prompt-01',
            kind: 'prompt',
            title: '需求分析提示词',
            body: '分析需求',
            promptInstruction: '生成需求分析提示词',
          },
        ],
        edges: [{ sourceId: 'step-01', targetId: 'prompt-01' }],
      }),
    )
    vi.mocked(optimizeFullPrompt).mockResolvedValue('# 角色：\n- 你是需求分析专家')
    const pending: unknown[] = []

    await generateFlowchartCanvasElementsStream({
      canvasId: 'canvas',
      edges: [],
      flowchartProvider: provider,
      instruction: '生成流程',
      onPromptPending: (preview) => pending.push(preview),
      origin: { x: 0, y: 0 },
      promptCards: [],
      promptOptimizationProvider: provider,
      shapeNodes: [],
    })

    expect(pending.length).toBeGreaterThanOrEqual(2)
    expect(pending[0]).toMatchObject({
      promptCards: [
        {
          defaultCollapsed: true,
          markdown: expect.stringContaining('# 生成中'),
          title: '需求分析提示词',
        },
      ],
    })
    expect(pending.at(-1)).toMatchObject({
      promptCards: [
        {
          markdown: expect.stringContaining('# 角色'),
        },
      ],
    })
  })

  it('generates prompt card content with at most five concurrent optimization requests', async () => {
    const promptCount = generatedPromptConcurrency + 1
    mockFlowchartStream(
      JSON.stringify({
        nodes: [
          { id: 'step-01', kind: 'step', title: '步骤', body: 'body' },
          ...Array.from({ length: promptCount }, (_, index) => ({
            id: `prompt-${index + 1}`,
            kind: 'prompt',
            title: `提示词 ${index + 1}`,
            body: `第 ${index + 1} 张描述`,
            promptInstruction: `生成第 ${index + 1} 张提示词`,
          })),
        ],
        edges: Array.from({ length: promptCount }, (_, index) => ({
          sourceId: index === 0 ? 'step-01' : `prompt-${index}`,
          targetId: `prompt-${index + 1}`,
        })),
      }),
    )
    const releases: Array<() => void> = []
    let running = 0
    let maxRunning = 0
    vi.mocked(optimizeFullPrompt).mockImplementation(async ({ instruction }) => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      await new Promise<void>((resolve) => releases.push(resolve))
      running -= 1
      return `# ${instruction.match(/第 \d+ 张/)?.[0] ?? '提示词'}`
    })

    const generation = generateFlowchartCanvasElementsStream({
      canvasId: 'canvas',
      edges: [],
      flowchartProvider: provider,
      instruction: '生成流程',
      origin: { x: 0, y: 0 },
      promptCards: [],
      promptOptimizationProvider: provider,
      shapeNodes: [],
    })

    await vi.waitFor(() => {
      expect(optimizeFullPrompt).toHaveBeenCalledTimes(generatedPromptConcurrency)
    })
    expect(maxRunning).toBe(generatedPromptConcurrency)

    releases.shift()?.()
    await vi.waitFor(() => {
      expect(optimizeFullPrompt).toHaveBeenCalledTimes(promptCount)
    })
    expect(maxRunning).toBe(generatedPromptConcurrency)

    releases.splice(0).forEach((release) => release())
    const result = await generation

    expect(result.promptCards.map((card) => card.title)).toEqual(
      Array.from({ length: promptCount }, (_, index) => `提示词 ${index + 1}`),
    )
    expect(result.promptCards.at(-1)?.markdown).toContain('# 第 6 张')
  })

  it('requires the prompt optimization provider when prompt nodes are generated', async () => {
    mockFlowchartStream(
      JSON.stringify({
        nodes: [
          { id: 'step-01', kind: 'step', title: '步骤', body: 'body' },
          { id: 'prompt-01', kind: 'prompt', title: '提示词', body: 'body' },
        ],
        edges: [{ sourceId: 'step-01', targetId: 'prompt-01' }],
      }),
    )

    await expect(
      generateFlowchartCanvasElements({
        canvasId: 'canvas',
        edges: [],
        flowchartProvider: provider,
        instruction: '生成流程',
        origin: { x: 0, y: 0 },
        promptCards: [],
        shapeNodes: [],
      }),
    ).rejects.toThrow('请先在设置里配置提示词优化模型')
  })
})

function mockFlowchartStream(output: string) {
  vi.mocked(requestCompletionStream).mockImplementationOnce(
    async (_provider, _messages, handlers) => {
      handlers.onText(output)
      return output
    },
  )
}
