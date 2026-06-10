import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractAssistantText,
  requestCompletion,
  requestCompletionStream,
  testProvider,
} from './ai'

const provider = {
  id: 'p',
  name: 'Provider',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'model',
  createdAt: 'now',
  updatedAt: 'now',
}

describe('ai api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts OpenAI-compatible assistant message text', () => {
    expect(
      extractAssistantText({
        choices: [{ message: { content: ' hello ' } }],
      }),
    ).toBe('hello')
  })

  it('extracts text and output_text fallbacks', () => {
    expect(extractAssistantText({ choices: [{ text: 'text' }] })).toBe('text')
    expect(extractAssistantText({ output_text: 'output' })).toBe('output')
  })

  it('throws structured upstream errors', () => {
    expect(() => extractAssistantText({ error: 'bad' })).toThrow('bad')
    expect(() => extractAssistantText({ error: { message: 'nested' } })).toThrow(
      'nested',
    )
  })

  it('requests completions through local proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        { status: 200 },
      ),
    )

    await expect(
      requestCompletion(provider, [{ role: 'user', content: 'hi' }], 'deep'),
    ).resolves.toBe('ok')
    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"thinkingMode":"deep"'),
      }),
    )
  })

  it('streams completion chunks through local proxy', async () => {
    const controller = new AbortController()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning_content":"think","content":""}}]}\n\n',
          ),
        )
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
        status: 200,
      }),
    )
    const chunks: string[] = []
    const thinking: string[] = []

    await expect(
      requestCompletionStream(provider, [], {
        onText: (chunk) => chunks.push(chunk),
        onThinking: (chunk) => thinking.push(chunk),
      }, 'on', controller.signal),
    ).resolves.toBe('ok')
    expect(chunks).toEqual(['ok'])
    expect(thinking).toEqual(['think'])
    expect(fetch).toHaveBeenCalledWith(
      '/api/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"thinkingMode":"on"'),
        signal: controller.signal,
      }),
    )
  })

  it('streams final unterminated and array content chunks', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":[{"text":"A"},{"content":"B"}]}}]}',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
        status: 200,
      }),
    )
    const chunks: string[] = []

    await expect(
      requestCompletionStream(provider, [], {
        onText: (chunk) => chunks.push(chunk),
      }),
    ).resolves.toBe('AB')
    expect(chunks).toEqual(['AB'])
  })

  it('streams choice-level reasoning fields', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"reasoningContentText":"plan","delta":{"content":"A"}}]}\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
        status: 200,
      }),
    )
    const thinking: string[] = []

    await requestCompletionStream(provider, [], {
      onText: () => undefined,
      onThinking: (chunk) => thinking.push(chunk),
    }, 'on')

    expect(thinking).toEqual(['plan'])
  })

  it('streams reasoning details arrays', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning_details":[{"summary":"step"}],"content":"A"}}]}\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
        status: 200,
      }),
    )
    const thinking: string[] = []

    await requestCompletionStream(provider, [], {
      onText: () => undefined,
      onThinking: (chunk) => thinking.push(chunk),
    }, 'on')

    expect(thinking).toEqual(['step'])
  })

  it('ignores reasoning fields when thinking is off', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning_content":"hidden","content":"A"}}]}\n\n',
          ),
        )
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
        status: 200,
      }),
    )
    const thinking: string[] = []

    await requestCompletionStream(provider, [], {
      onText: () => undefined,
      onThinking: (chunk) => thinking.push(chunk),
    }, 'off')

    expect(thinking).toEqual([])
  })

  it('falls back to json payloads for non-sse stream responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'json' } }] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )
    const chunks: string[] = []

    await expect(
      requestCompletionStream(provider, [], {
        onText: (chunk) => chunks.push(chunk),
      }),
    ).resolves.toBe('json')
    expect(chunks).toEqual(['json'])
  })

  it('surfaces completion request errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'nope' } }), {
        status: 500,
      }),
    )

    await expect(requestCompletion(provider, [])).rejects.toThrow('nope')
  })

  it('surfaces plain text completion errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('plain failure', { status: 500 }),
    )

    await expect(requestCompletion(provider, [])).rejects.toThrow('plain failure')
  })

  it('tests provider connectivity', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
      }),
    )

    await expect(testProvider(provider)).resolves.toBe('测试成功')
  })

  it('surfaces provider errors when response body is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', { status: 500, statusText: 'Server Error' }),
    )

    await expect(testProvider(provider)).rejects.toThrow('Server Error')
  })

  it('surfaces provider connectivity errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, status: 401, error: 'bad key' }), {
        status: 401,
      }),
    )

    await expect(testProvider(provider)).rejects.toThrow('401 bad key')
  })
})
