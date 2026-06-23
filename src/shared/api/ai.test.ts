import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractAssistantText,
  listProviderModels,
  requestCompletion,
  requestCompletionStream,
  requestEmbeddings,
  requestRerank,
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

  it('requests embeddings through local proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [1, 2, 3] }] }), {
        status: 200,
      }),
    )

    await expect(requestEmbeddings(provider, 'text-embedding-v4', ['hello'])).resolves.toEqual([[1, 2, 3]])
    expect(fetch).toHaveBeenCalledWith(
      '/api/embeddings',
      expect.objectContaining({
        body: expect.stringContaining('"model":"text-embedding-v4"'),
      }),
    )
  })

  it('surfaces structured embedding request errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'wrong endpoint' }), {
        status: 404,
        statusText: 'Not Found',
      }),
    )

    await expect(
      requestEmbeddings(provider, 'text-embedding-v4', ['hello']),
    ).rejects.toThrow('404 wrong endpoint')
  })

  it('surfaces plain text embedding request errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', {
        status: 404,
        statusText: 'Not Found',
      }),
    )

    await expect(
      requestEmbeddings(provider, 'text-embedding-v4', ['hello']),
    ).rejects.toThrow('404 not found')
  })

  it('requests rerank through local proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [{ index: 1, relevance_score: 0.8 }] }), {
        status: 200,
      }),
    )

    await expect(requestRerank(provider, 'qwen3-rerank', 'q', ['a', 'b'])).resolves.toEqual([
      { index: 1, score: 0.8 },
    ])
    expect(fetch).toHaveBeenCalledWith(
      '/api/rerank',
      expect.objectContaining({
        body: expect.stringContaining('"model":"qwen3-rerank"'),
      }),
    )
  })

  it('surfaces rerank request errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'bad rerank route' } }), {
        status: 400,
      }),
    )

    await expect(requestRerank(provider, 'qwen3-rerank', 'q', ['a'])).rejects.toThrow(
      '400 bad rerank route',
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

  it('tests embedding models through the embedding proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: [1, 2, 3] }] }), {
        status: 200,
      }),
    )

    await expect(testProvider({ ...provider, model: 'text-embedding-v4' })).resolves.toBe(
      '嵌入模型测试成功',
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/embeddings',
      expect.objectContaining({
        body: expect.stringContaining('"model":"text-embedding-v4"'),
      }),
    )
  })

  it('tests rerank models through the rerank proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ results: [{ index: 0, relevance_score: 0.9 }] }), {
        status: 200,
      }),
    )

    await expect(testProvider({ ...provider, model: 'gte-rerank-v2' })).resolves.toBe(
      '重排模型测试成功',
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/rerank',
      expect.objectContaining({
        body: expect.stringContaining('"model":"gte-rerank-v2"'),
      }),
    )
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

  it('lists provider models through local proxy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          models: [
            { id: 'model-a', name: 'Model A' },
            { id: 'model-b' },
            { name: 'missing id' },
          ],
        }),
        { status: 200 },
      ),
    )

    await expect(listProviderModels(provider)).resolves.toEqual([
      { id: 'model-a', name: 'Model A', enabled: true },
      { id: 'model-b', name: undefined, enabled: true },
    ])
    expect(fetch).toHaveBeenCalledWith(
      '/api/provider-models',
      expect.objectContaining({
        body: expect.stringContaining('"baseUrl":"https://api.example.com"'),
      }),
    )
  })

  it('surfaces provider model list errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, status: 401, error: 'bad key' }), {
        status: 401,
      }),
    )

    await expect(listProviderModels(provider)).rejects.toThrow('401 bad key')
  })

  it('surfaces provider model list errors when response body is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', { status: 500, statusText: 'Server Error' }),
    )

    await expect(listProviderModels(provider)).rejects.toThrow('Server Error')
  })
})
