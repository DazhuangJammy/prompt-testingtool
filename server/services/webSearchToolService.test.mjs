import { describe, expect, it, vi } from 'vitest'

vi.mock('./webSearchService.mjs', () => ({
  searchWeb: vi.fn(async ({ query }) => ({
    providerId: 'bing',
    providerName: 'Bing',
    query,
    results: [
      {
        title: 'AI News',
        content: 'Current AI news',
        url: 'https://example.com/ai',
        sourceInput: query,
      },
    ],
  })),
}))

const { runWebSearchToolLoop } = await import(
  './webSearchToolService.mjs'
)

const jsonResponse = (payload) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('webSearchToolService', () => {
  it('runs web__search tool calls and asks the model for a final answer', async () => {
    const onEvent = vi.fn()
    const requestChatCompletion = vi.fn(async ({ messages, tools, toolChoice }) => {
      expect(tools).toBeUndefined()
      expect(toolChoice).toBeUndefined()
      expect(messages[0]).toMatchObject({ role: 'system' })
      expect(messages[0].content).toContain('不要只罗列链接')
      expect(messages.some((message) => message.role === 'tool')).toBe(false)
      expect(messages.at(-1)).toMatchObject({ role: 'user' })
      return jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'answer [1]' } }],
      })
    })
    const initialResponse = jsonResponse({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: {
                  name: 'web__search',
                  arguments: JSON.stringify({ query: 'AI news today' }),
                },
              },
            ],
          },
        },
      ],
    })

    const result = await runWebSearchToolLoop({
      initialResponse,
      onEvent,
      requestChatCompletion,
      requestOptions: {
        messages: [{ role: 'user', content: 'today ai news' }],
      },
      webSearch: {
        providerId: 'bing',
        settings: {
          providers: [
            {
              id: 'bing',
              name: 'Bing',
              enabled: true,
              apiKeys: [],
            },
          ],
        },
      },
    })

    await expect(result.response.json()).resolves.toMatchObject({
      choices: [{ message: { content: 'answer [1]' } }],
    })
    expect(result.references).toEqual([
      expect.objectContaining({ title: 'AI News', providerName: 'Bing' }),
    ])
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webSearchStatus: expect.objectContaining({ phase: 'searching' }),
      }),
    )
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webSearchReferences: [
          expect.objectContaining({ title: 'AI News' }),
        ],
        webSearchStatus: expect.objectContaining({ phase: 'complete', count: 1 }),
      }),
    )
    expect(requestChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: false,
      }),
    )
  })

  it('keeps the final answer streaming after search results are ready', async () => {
    const requestChatCompletion = vi.fn(async ({ stream, messages }) => {
      expect(stream).toBe(true)
      expect(messages[0]).toMatchObject({ role: 'system' })
      return new Response('data: {"choices":[{"delta":{"content":"answer"}}]}\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    })
    const initialResponse = jsonResponse({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: {
                  name: 'web__search',
                  arguments: JSON.stringify({ query: 'AI news today' }),
                },
              },
            ],
          },
        },
      ],
    })

    const result = await runWebSearchToolLoop({
      finalStream: true,
      initialResponse,
      requestChatCompletion,
      requestOptions: {
        messages: [{ role: 'user', content: 'today ai news' }],
        stream: false,
      },
      webSearch: {
        providerId: 'bing',
        settings: {
          providers: [
            {
              id: 'bing',
              name: 'Bing',
              enabled: true,
              apiKeys: [],
            },
          ],
        },
      },
    })

    expect(result.response.headers.get('content-type')).toContain('text/event-stream')
    await expect(result.response.text()).resolves.toContain('answer')
    expect(result.references).toHaveLength(1)
  })

  it('falls back to direct search when the model does not call the tool', async () => {
    const requestChatCompletion = vi.fn(async ({ messages, tools, toolChoice }) => {
      expect(tools).toBeUndefined()
      expect(toolChoice).toBeUndefined()
      expect(messages[0]).toMatchObject({ role: 'system' })
      expect(messages[0].content).toContain('[1] AI News')
      expect(messages[0].content).toContain('today ai news')
      return jsonResponse({
        choices: [{ message: { role: 'assistant', content: 'fallback answer [1]' } }],
      })
    })
    const initialResponse = jsonResponse({
      choices: [{ message: { role: 'assistant', content: '' } }],
    })

    const result = await runWebSearchToolLoop({
      initialResponse,
      requestChatCompletion,
      requestOptions: {
        messages: [{ role: 'user', content: 'today ai news' }],
      },
      webSearch: {
        providerId: 'bing',
        settings: {
          providers: [
            {
              id: 'bing',
              name: 'Bing',
              enabled: true,
              apiKeys: [],
            },
          ],
        },
      },
    })

    await expect(result.response.json()).resolves.toMatchObject({
      choices: [{ message: { content: 'fallback answer [1]' } }],
    })
    expect(result.references).toEqual([
      expect.objectContaining({ title: 'AI News', providerName: 'Bing' }),
    ])
  })
})
