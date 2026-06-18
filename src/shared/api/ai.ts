import type {
  CompletionMessage,
  ProviderConfig,
  ProviderModelConfig,
  ThinkingMode,
} from '@/shared/types'

export const extractAssistantText = (payload: unknown) => {
  const data = payload as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
    output_text?: string
    error?: { message?: string } | string
  }

  if (typeof data.error === 'string') throw new Error(data.error)
  if (data.error?.message) throw new Error(data.error.message)

  const content =
    data.choices?.[0]?.message?.content ??
    data.choices?.[0]?.text ??
    data.output_text

  return content?.trim() || ''
}

export const requestCompletion = async (
  provider: ProviderConfig,
  messages: CompletionMessage[],
  thinkingMode: ThinkingMode = 'off',
  signal?: AbortSignal,
) => {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      provider: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      },
      model: provider.model,
      messages,
      thinkingMode,
    }),
  })

  const text = await response.text()
  let payload: unknown = text

  try {
    payload = JSON.parse(text)
  } catch {
    if (!response.ok) throw new Error(text || 'Request failed')
  }

  if (!response.ok) {
    const errorPayload = payload as { error?: string | { message?: string } }
    if (typeof errorPayload.error === 'string') throw new Error(errorPayload.error)
    throw new Error(errorPayload.error?.message || 'Request failed')
  }

  return extractAssistantText(payload)
}

interface StreamHandlers {
  onText: (chunk: string) => void
  onThinking?: (chunk: string) => void
}

export const requestCompletionStream = async (
  provider: ProviderConfig,
  messages: CompletionMessage[],
  handlers: StreamHandlers,
  thinkingMode: ThinkingMode = 'off',
  signal?: AbortSignal,
) => {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      provider: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      },
      model: provider.model,
      messages,
      stream: true,
      thinkingMode,
    }),
  })

  if (!response.body) {
    return requestCompletion(provider, messages, thinkingMode, signal)
  }
  if (!response.ok) throw new Error(await response.text())

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    const payload = await response.json().catch(() => undefined)
    const text = extractAssistantText(payload)
    if (text) handlers.onText(text)
    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let pending = Promise.resolve()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const chunk = parseStreamBlock(part, thinkingMode)
      if (chunk.thinking) {
        pending = pending.then(() => handlers.onThinking?.(chunk.thinking))
        await pending
      }
      if (chunk.text) {
        fullText += chunk.text
        pending = pending.then(() => handlers.onText(chunk.text))
        await pending
      }
    }
  }

  const finalChunk = parseStreamBlock(buffer, thinkingMode)
  if (finalChunk.thinking) handlers.onThinking?.(finalChunk.thinking)
  if (finalChunk.text) {
    fullText += finalChunk.text
    handlers.onText(finalChunk.text)
  }

  return fullText
}

function parseStreamBlock(block: string, thinkingMode: ThinkingMode = 'off') {
  return block.split('\n').reduce(
    (result, line) => {
      if (!line.startsWith('data:')) return result
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') return result
      const chunk = parseStreamDelta(data, thinkingMode)
      return {
        text: result.text + chunk.text,
        thinking: result.thinking + chunk.thinking,
      }
    },
    { text: '', thinking: '' },
  )
}

function parseStreamDelta(data: string, thinkingMode: ThinkingMode = 'off') {
  const payload = JSON.parse(data) as {
    choices?: Array<{
      text?: unknown
      delta?: {
        content?: unknown
        reasoning?: unknown
        reasoning_content?: unknown
        reasoningContent?: unknown
        reasoningContentText?: unknown
        reasoning_details?: unknown
        reasoningDetails?: unknown
      }
      message?: {
        content?: unknown
        reasoning?: unknown
        reasoning_content?: unknown
        reasoningContent?: unknown
        reasoningContentText?: unknown
        reasoning_details?: unknown
        reasoningDetails?: unknown
      }
      reasoning?: unknown
      reasoning_content?: unknown
      reasoningContent?: unknown
      reasoningContentText?: unknown
      reasoning_details?: unknown
      reasoningDetails?: unknown
    }>
  }
  const choice = payload.choices?.[0]
  const delta = choice?.delta ?? choice?.message
  const thinking =
    thinkingMode === 'off'
      ? ''
      : normalizeDeltaText(
          delta?.reasoning_content ??
            delta?.reasoning ??
            delta?.reasoningContent ??
            delta?.reasoningContentText ??
            delta?.reasoning_details ??
            delta?.reasoningDetails ??
            choice?.reasoning_content ??
            choice?.reasoning ??
            choice?.reasoningContent ??
            choice?.reasoningContentText ??
            choice?.reasoning_details ??
            choice?.reasoningDetails,
        )

  return {
    text: normalizeDeltaText(delta?.content ?? choice?.text),
    thinking,
  }
}

function normalizeDeltaText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const part = item as { content?: unknown; text?: unknown; summary?: unknown }
          return normalizeDeltaText(part.text ?? part.content ?? part.summary)
        }
        return ''
      })
      .join('')
  }
  return ''
}

export const testProvider = async (provider: ProviderConfig) => {
  const response = await fetch('/api/test-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      },
      model: provider.model,
    }),
  })

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean
    message?: string
    error?: string
    status?: number
  } | null

  if (!response.ok || !payload?.ok) {
    throw new Error(
      [payload?.status, payload?.error || response.statusText]
        .filter(Boolean)
        .join(' '),
    )
  }

  return payload.message || '测试成功'
}

export const listProviderModels = async (
  provider: ProviderConfig,
): Promise<ProviderModelConfig[]> => {
  const response = await fetch('/api/provider-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      },
    }),
  })

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean
    models?: Array<{ id?: string; name?: string }>
    error?: string
    status?: number
  } | null

  if (!response.ok || !payload?.ok) {
    throw new Error(
      [payload?.status, payload?.error || response.statusText]
        .filter(Boolean)
        .join(' '),
    )
  }

  return (payload.models ?? []).reduce<ProviderModelConfig[]>((result, model) => {
    const id = model.id?.trim()
    if (!id) return result
    result.push({
      id,
      name: model.name?.trim() || undefined,
      enabled: true,
    })
    return result
  }, [])
}
