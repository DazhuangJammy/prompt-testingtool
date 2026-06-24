import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requestChatCompletion: vi.fn(),
  runWebSearchToolLoop: vi.fn(),
  shouldUseWebSearchTools: vi.fn(),
}))

vi.mock('../services/openaiCompatibleService.mjs', () => ({
  parseUpstreamError: vi.fn(),
  requestChatCompletion: mocks.requestChatCompletion,
  requestEmbeddings: vi.fn(),
  requestModelList: vi.fn(),
  requestRerank: vi.fn(),
}))

vi.mock('../services/webSearchToolService.mjs', () => ({
  runWebSearchToolLoop: mocks.runWebSearchToolLoop,
  shouldUseWebSearchTools: mocks.shouldUseWebSearchTools,
  webSearchToolDefinition: {
    type: 'function',
    function: { name: 'web__search' },
  },
}))

const { proxyChatCompletion } = await import('./chatController.mjs')

describe('chatController web search tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('streams tool search references before the final answer', async () => {
    mocks.shouldUseWebSearchTools.mockReturnValue(true)
    mocks.requestChatCompletion.mockResolvedValue(new Response('{}'))
    mocks.runWebSearchToolLoop.mockImplementation(async ({ onEvent }) => {
      onEvent({
        webSearchStatus: {
          phase: 'searching',
          query: 'AI news',
          providerName: 'Bing',
        },
      })
      return {
        response: new Response(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: 'answer [1]' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
        references: [
          {
            title: 'AI News',
            content: 'Current AI news',
            url: 'https://example.com/ai',
            sourceInput: 'AI news',
            providerId: 'bing',
            providerName: 'Bing',
          },
        ],
      }
    })
    const res = createResponse()

    await proxyChatCompletion(
      {
        body: {
          provider: { baseUrl: 'https://api.example.com', apiKey: 'key' },
          model: 'model',
          messages: [{ role: 'user', content: 'today ai news' }],
          stream: true,
          webSearch: { providerId: 'bing' },
        },
      },
      res,
    )

    expect(mocks.requestChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: false,
        tools: [expect.objectContaining({ type: 'function' })],
        toolChoice: 'auto',
      }),
    )
    expect(mocks.runWebSearchToolLoop).toHaveBeenCalledWith(
      expect.objectContaining({ finalStream: true }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.type).toHaveBeenCalledWith('text/event-stream')
    const output = res.writes.join('')
    expect(output).toContain('"phase":"preparing"')
    expect(output).toContain('"phase":"searching"')
    expect(output).toContain('"webSearchReferences"')
    expect(output).toContain('answer [1]')
  })

  it('pipes the final model SSE after emitting web search references', async () => {
    mocks.shouldUseWebSearchTools.mockReturnValue(true)
    mocks.requestChatCompletion.mockResolvedValue(new Response('{}'))
    mocks.runWebSearchToolLoop.mockResolvedValue({
      response: new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"streamed "}}]}\n\n',
              ),
            )
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"answer [1]"}}]}\n\n',
              ),
            )
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
            controller.close()
          },
        }),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
      references: [
        {
          title: 'AI News',
          content: 'Current AI news',
          url: 'https://example.com/ai',
          sourceInput: 'AI news',
          providerId: 'bing',
          providerName: 'Bing',
        },
      ],
    })
    const res = createResponse()

    await proxyChatCompletion(
      {
        body: {
          provider: { baseUrl: 'https://api.example.com', apiKey: 'key' },
          model: 'model',
          messages: [{ role: 'user', content: 'today ai news' }],
          stream: true,
          webSearch: { providerId: 'bing' },
        },
      },
      res,
    )

    const output = res.writes.join('')
    expect(output.indexOf('"webSearchReferences"')).toBeLessThan(
      output.indexOf('streamed '),
    )
    expect(output).toContain('streamed ')
    expect(output).toContain('answer [1]')
    expect(output).toContain('[DONE]')
  })
})

function createResponse() {
  return {
    destroyed: false,
    writes: [],
    end: vi.fn(),
    flushHeaders: vi.fn(),
    json: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(function status() {
      return this
    }),
    type: vi.fn(function type() {
      return this
    }),
    write: vi.fn(function write(chunk) {
      this.writes.push(String(chunk))
      return true
    }),
  }
}
