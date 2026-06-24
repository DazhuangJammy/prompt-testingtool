export const buildChatEndpoint = (baseUrl) => {
  const clean = String(baseUrl ?? '').replace(/\/$/, '')
  if (!clean) throw new Error('Base URL missing')
  if (clean.endsWith('/chat/completions')) return new URL(clean)
  if (clean.endsWith('/v1')) return new URL(`${clean}/chat/completions`)
  return new URL(`${clean}/v1/chat/completions`)
}

export const buildModelsEndpoint = (baseUrl) => {
  const clean = String(baseUrl ?? '').replace(/\/$/, '')
  if (!clean) throw new Error('Base URL missing')
  if (clean.endsWith('/models')) return new URL(clean)
  if (clean.endsWith('/chat/completions')) {
    return new URL(clean.replace(/\/chat\/completions$/, '/models'))
  }
  if (clean.endsWith('/v1')) return new URL(`${clean}/models`)
  return new URL(`${clean}/v1/models`)
}

export const buildEmbeddingsEndpoint = (baseUrl) => {
  const clean = String(baseUrl ?? '').replace(/\/$/, '')
  if (!clean) throw new Error('Base URL missing')
  if (clean.endsWith('/embeddings')) return new URL(clean)
  if (clean.endsWith('/chat/completions')) {
    return new URL(clean.replace(/\/chat\/completions$/, '/embeddings'))
  }
  if (clean.endsWith('/v1')) return new URL(`${clean}/embeddings`)
  return new URL(`${clean}/v1/embeddings`)
}

export const buildRerankEndpoint = (baseUrl, model = '') => {
  const clean = String(baseUrl ?? '').replace(/\/$/, '')
  if (!clean) throw new Error('Base URL missing')
  if (clean.endsWith('/reranks')) return new URL(clean)
  if (clean.includes('dashscope.aliyuncs.com') && !isQwenRerankModel(model)) {
    return new URL('https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank')
  }
  if (clean.includes('dashscope.aliyuncs.com')) {
    return new URL('https://dashscope.aliyuncs.com/compatible-api/v1/reranks')
  }
  if (clean.endsWith('/v1')) return new URL(`${clean}/reranks`)
  return new URL(`${clean}/v1/reranks`)
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
  tools,
  toolChoice,
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
    tools,
    toolChoice,
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

export const requestModelList = async ({ provider, signal }) => {
  const endpoint = buildModelsEndpoint(provider.baseUrl)

  return fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    signal,
  })
}

export const requestEmbeddings = async ({
  provider,
  model,
  input,
  signal,
}) => {
  const endpoint = buildEmbeddingsEndpoint(provider.baseUrl)

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ model, input }),
  })
}

export const requestRerank = async ({
  provider,
  model,
  query,
  documents,
  topN,
  signal,
}) => {
  const endpoint = buildRerankEndpoint(provider.baseUrl, model)

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify(buildRerankRequestBody({ documents, model, query, topN })),
  })
}

export const buildRerankRequestBody = ({ model, query, documents, topN }) => {
  if (isQwenRerankModel(model)) {
    return {
      model,
      query,
      documents,
      top_n: topN,
    }
  }

  return {
    model,
    input: { query, documents },
    parameters: {
      top_n: topN,
      return_documents: false,
    },
  }
}

function isQwenRerankModel(model) {
  return /^qwen3-rerank$/i.test(String(model ?? ''))
}

export const buildChatRequestBody = ({
  provider,
  model,
  messages,
  temperature,
  maxTokens,
  stream,
  thinkingMode,
  tools,
  toolChoice,
}) => {
  const target = providerSignature({ model, provider })
  const isMoonshot = isMoonshotProvider(target)

  return {
    model,
    messages,
    stream,
    ...(!isMoonshot && temperature !== undefined ? { temperature } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(Array.isArray(tools) && tools.length ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
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
