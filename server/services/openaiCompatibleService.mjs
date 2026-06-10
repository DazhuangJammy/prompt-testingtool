export const buildChatEndpoint = (baseUrl) => {
  const clean = String(baseUrl ?? '').replace(/\/$/, '')
  if (!clean) throw new Error('Base URL missing')
  if (clean.endsWith('/chat/completions')) return new URL(clean)
  if (clean.endsWith('/v1')) return new URL(`${clean}/chat/completions`)
  return new URL(`${clean}/v1/chat/completions`)
}

export const parseUpstreamError = (text) => {
  try {
    const payload = JSON.parse(text)
    if (typeof payload.error === 'string') return payload.error
    if (payload.error?.message) return payload.error.message
    if (payload.message) return payload.message
    return JSON.stringify(payload)
  } catch {
    return text
  }
}

export const requestChatCompletion = async ({
  provider,
  model,
  messages,
  temperature = 0.7,
  maxTokens,
  signal,
  stream = false,
  thinkingMode = 'off',
}) => {
  const endpoint = buildChatEndpoint(provider.baseUrl)
  const body = buildChatRequestBody({
    maxTokens,
    messages,
    model,
    provider,
    stream,
    temperature,
    thinkingMode,
  })

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify(body),
  })
}

export const buildChatRequestBody = ({
  provider,
  model,
  messages,
  temperature,
  maxTokens,
  stream,
  thinkingMode,
}) => {
  const target = providerSignature({ model, provider })
  const isMoonshot = isMoonshotProvider(target)

  return {
    model,
    messages,
    stream,
    ...(!isMoonshot && temperature !== undefined ? { temperature } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...buildThinkingOptions({ model, provider, thinkingMode }),
  }
}

export const buildThinkingOptions = ({ model, provider, thinkingMode }) => {
  const target = providerSignature({ model, provider })
  const isMiniMax = target.includes('minimax')
  const isMiniMaxM3 = isMiniMax && /\bm3\b|minimax-m3|minimaxai\/minimax-m3/.test(target)
  const isMoonshot = isMoonshotProvider(target)
  const isQwen = target.includes('qwen') || target.includes('dashscope')

  if (!thinkingMode || thinkingMode === 'auto') {
    return {}
  }

  if (thinkingMode === 'off') {
    if (isMoonshot) return { thinking: { type: 'disabled' } }
    if (isQwen) return { enable_thinking: false }
    return isMiniMaxM3 ? { thinking: { type: 'disabled' } } : {}
  }
  const effort = thinkingMode === 'deep'
    ? 'high'
    : thinkingMode === 'light'
      ? 'low'
      : 'medium'

  if (isQwen) {
    return {
      enable_thinking: true,
      thinking_budget: qwenThinkingBudget(thinkingMode),
    }
  }

  if (isMoonshot) {
    return { thinking: { type: 'enabled' } }
  }

  if (isMiniMaxM3) {
    return { thinking: { type: 'adaptive' } }
  }

  if (isMiniMax) {
    return { reasoning_split: true }
  }

  if (target.includes('deepseek')) {
    return {
      reasoning_effort: effort,
      thinking: { type: thinkingMode === 'deep' ? 'enabled' : 'auto' },
    }
  }

  return {}
}

const qwenThinkingBudget = (thinkingMode) => {
  if (thinkingMode === 'light') return 512
  if (thinkingMode === 'deep') return 4096
  return 1536
}

const providerSignature = ({ model, provider }) =>
  `${provider?.name ?? ''} ${provider?.baseUrl ?? ''} ${model ?? ''}`.toLowerCase()

const isMoonshotProvider = (target) =>
  target.includes('moonshot') ||
  target.includes('kimi') ||
  target.includes('api.moonshot.cn') ||
  target.includes('api.moonshot.ai') ||
  target.includes('api.kimi.com')
