import { searchWeb } from './webSearchService.mjs'

const WEB_SEARCH_TOOL_NAME = 'web__search'
const MAX_TOOL_ROUNDS = 3
const LOCAL_FALLBACK_ORDER = ['bing', 'google', 'baidu']
const SUPPORTED_PROVIDER_IDS = new Set([
  'tavily',
  'searxng',
  'exa',
  'bocha',
  'zhipu',
  'querit',
  'jina',
  'google',
  'bing',
  'baidu',
])
const API_KEY_PROVIDER_IDS = new Set(['tavily', 'exa', 'bocha', 'zhipu', 'querit'])

export const webSearchToolDefinition = {
  type: 'function',
  function: {
    name: WEB_SEARCH_TOOL_NAME,
    description: `Search the web for current information, news, and real-time data.

Use this when:
- The user asks about recent events, current prices, or live data
- You need to verify facts you're uncertain about or that may have changed
- The user references something you don't have context on

Don't use for:
- Math, code reasoning, or things you can answer from your training
- Well-known facts unlikely to have changed

You may call this multiple times with different queries to broaden coverage. Cite sources by [id] in your final answer.`,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          maxLength: 200,
          description:
            'Self-contained web search query. MUST NOT use pronouns ("it", "their") or context-dependent references; expand the topic from earlier messages when the user asks a follow-up. Examples: "Anthropic Claude 4.5 release date", not "when did it ship".',
        },
      },
      required: ['query'],
    },
  },
}

export function shouldUseWebSearchTools(webSearch) {
  return Boolean(resolveWebSearchProvider(webSearch))
}

export async function runWebSearchToolLoop({
  finalStream = false,
  initialResponse,
  onEvent,
  requestChatCompletion,
  requestOptions,
  webSearch,
}) {
  let response = initialResponse
  let messages = requestOptions.messages
  const references = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const payload = await readJsonResponseWithFallback(response, {
      requestChatCompletion,
      requestOptions,
      references,
      webSearch,
      onEvent,
    })
    if (payload.fallbackResult) return payload.fallbackResult

    const assistantMessage = payload.choices?.[0]?.message
    const toolCalls = normalizeToolCalls(assistantMessage?.tool_calls)
    if (!toolCalls.length) {
      const content = extractAssistantContent(payload).trim()
      if (!content) {
        return runFallbackWebSearchAnswer({
          finalStream,
          onEvent,
          requestChatCompletion,
          requestOptions,
          references,
          webSearch,
        })
      }
      return { response: jsonResponse(payload), references }
    }

    messages = [...messages, assistantMessage]
    for (const toolCall of toolCalls) {
      const output = await executeWebSearchTool(toolCall, webSearch, references, onEvent)
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: WEB_SEARCH_TOOL_NAME,
        content: JSON.stringify(output),
      })
    }

    if (!references.length) {
      return runFallbackWebSearchAnswer({
        finalStream,
        onEvent,
        requestChatCompletion,
        requestOptions,
        references,
        webSearch,
      })
    }

    return requestFinalWebSearchAnswer({
      finalStream,
      messages: requestOptions.messages,
      query: extractLatestUserText(requestOptions.messages),
      references,
      requestChatCompletion,
      requestOptions,
    })
  }

  return { response, references }
}

async function readJsonResponseWithFallback(
  response,
  { finalStream, onEvent, requestChatCompletion, requestOptions, references, webSearch },
) {
  try {
    return await readJsonResponse(response)
  } catch (error) {
    return {
      fallbackResult: await runFallbackWebSearchAnswer({
        finalStream,
        onEvent,
        requestChatCompletion,
        requestOptions,
        references,
        webSearch,
        searchError: error,
      }),
    }
  }
}

async function executeWebSearchTool(toolCall, webSearch, references, onEvent) {
  try {
    const query = parseToolQuery(toolCall)
    const provider = resolveWebSearchProvider(webSearch)
    if (!provider) throw new Error('请先在设置里配置可用的网络搜索服务商')
    onEvent?.({
      webSearchStatus: {
        phase: 'searching',
        providerName: provider.name,
        query,
      },
    })
    const result = await searchWeb({
      provider,
      query,
      settings: webSearch.settings,
    })
    const mapped = result.results.map((item) => ({
      ...item,
      providerId: result.providerId,
      providerName: result.providerName,
    }))
    references.push(...mapped)
    onEvent?.({
      webSearchReferences: references,
      webSearchStatus: {
        phase: 'complete',
        providerName: result.providerName,
        query: result.query,
        count: references.length,
      },
    })
    return mapped.map((item, index) => ({
      id: references.length - mapped.length + index + 1,
      title: item.title,
      url: item.url,
      content: item.content,
    }))
  } catch (error) {
    onEvent?.({
      webSearchStatus: {
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return {
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runFallbackWebSearchAnswer({
  finalStream,
  onEvent,
  requestChatCompletion,
  requestOptions,
  references,
  webSearch,
  searchError,
}) {
  const query = extractLatestUserText(requestOptions.messages)
  let fallbackError = searchError

  if (!references.length) {
    const result = await executeDirectWebSearch(query, webSearch, references, onEvent)
    fallbackError = result.error ?? fallbackError
  }

  if (!references.length) {
    return {
      response: jsonResponse(createNoSearchResultPayload(fallbackError)),
      references,
    }
  }

  return requestFinalWebSearchAnswer({
    finalStream,
    messages: requestOptions.messages,
    query,
    references,
    requestChatCompletion,
    requestOptions,
  })
}

async function executeDirectWebSearch(query, webSearch, references, onEvent) {
  try {
    if (!query) throw new Error('搜索关键词不能为空')
    const provider = resolveWebSearchProvider(webSearch)
    if (!provider) throw new Error('请先在设置里配置可用的网络搜索服务商')
    onEvent?.({
      webSearchStatus: {
        phase: 'searching',
        providerName: provider.name,
        query,
      },
    })
    const result = await searchWeb({
      provider,
      query,
      settings: webSearch.settings,
    })
    const mapped = result.results.map((item) => ({
      ...item,
      providerId: result.providerId,
      providerName: result.providerName,
    }))
    references.push(...mapped)
    if (!mapped.length) throw new Error(`${result.providerName} 没有返回搜索结果`)
    onEvent?.({
      webSearchReferences: references,
      webSearchStatus: {
        phase: 'complete',
        providerName: result.providerName,
        query: result.query,
        count: references.length,
      },
    })
    return {}
  } catch (error) {
    onEvent?.({
      webSearchStatus: {
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
    })
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

async function requestFinalWebSearchAnswer({
  finalStream,
  messages,
  query,
  references,
  requestChatCompletion,
  requestOptions,
}) {
  try {
    const contextMessage = createWebSearchContextMessage(references, query)
    const response = await requestChatCompletion({
      ...requestOptions,
      stream: finalStream,
      messages: mergeSystemContext(messages, contextMessage),
    })

    if (finalStream) {
      if (response.ok) return { response, references }
      return {
        response: jsonResponse(createSearchOnlyPayload(references)),
        references,
      }
    }

    const payload = await readJsonResponse(response)
    const content = extractAssistantContent(payload).trim()
    if (content) return { response: jsonResponse(payload), references }
  } catch {
    // If the model still fails after search, return the sources instead of
    // surfacing an empty upstream response to the chat UI.
  }

  return {
    response: jsonResponse(createSearchOnlyPayload(references)),
    references,
  }
}

function mergeSystemContext(messages, contextMessage) {
  const [firstMessage, ...restMessages] = messages
  if (firstMessage?.role !== 'system') return [contextMessage, ...messages]

  return [
    {
      ...firstMessage,
      content: [normalizeContentText(firstMessage.content), contextMessage.content]
        .filter(Boolean)
        .join('\n\n'),
    },
    ...restMessages,
  ]
}

function parseToolQuery(toolCall) {
  const rawArguments = toolCall.function?.arguments ?? '{}'
  const parsed = typeof rawArguments === 'string'
    ? JSON.parse(rawArguments || '{}')
    : rawArguments
  const query = String(parsed.query ?? '').trim()
  if (query.length < 2) throw new Error('搜索关键词不能为空')
  return query.slice(0, 200)
}

function extractLatestUserText(messages = []) {
  const userMessage = [...messages].reverse().find((message) => message?.role === 'user')
  return normalizeContentText(userMessage?.content).trim().slice(0, 500)
}

function createWebSearchContextMessage(references, query) {
  return {
    role: 'system',
    content: [
      '你已获得联网搜索结果。请只基于这些搜索结果和已有对话回答用户最新问题。',
      '不要只罗列链接；先综合搜索结果给出清楚总结，再补充关键细节。',
      '如果搜索结果不足以回答，请明确说明不足，不要编造。',
      '引用来源时在对应句子末尾使用 [1]、[2] 这样的序号；每条重要事实至少引用一个来源。',
      '除非用户明确要求，不要输出裸 URL。',
      `用户搜索意图：${query || '未提供'}`,
      '',
      ...references.map(
        (item, index) =>
          `[${index + 1}] ${item.title || item.url}\nURL: ${item.url}\n摘要: ${
            item.content || '无摘要'
          }`,
      ),
    ].join('\n\n'),
  }
}

function createSearchOnlyPayload(references) {
  const content = [
    '已完成联网搜索，但上游模型没有生成回答。先把可用来源列给你：',
    '',
    ...references.map(
      (item, index) => `${index + 1}. ${item.title || item.url} [${index + 1}]\n${item.url}`,
    ),
  ].join('\n')
  return createAssistantPayload(content)
}

function createNoSearchResultPayload(error) {
  const reason = error instanceof Error ? error.message : String(error || '')
  return createAssistantPayload(
    [
      '联网搜索没有返回可用结果。',
      reason ? `原因：${reason}` : '',
      '如果你选择的是百度、必应或谷歌，这类公开网页搜索没有稳定官方接口，直接抓取搜索页可能被拦截、返回登录页或空页。更稳定的方式是配置 Tavily、Bocha、Jina 或 Searxng 这类可调用的搜索服务。',
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

function createAssistantPayload(content) {
  return {
    choices: [
      {
        message: {
          role: 'assistant',
          content,
        },
      },
    ],
  }
}

function normalizeToolCalls(toolCalls) {
  if (!Array.isArray(toolCalls)) return []
  return toolCalls.filter((toolCall) => toolCall?.function?.name === WEB_SEARCH_TOOL_NAME)
}

function resolveWebSearchProvider(webSearch) {
  const settings = webSearch?.settings
  if (!settings || !Array.isArray(settings.providers)) return undefined
  const preferredProviderId = webSearch.providerId ?? settings.defaultProviderId
  const preferred = settings.providers.find(
    (provider) => provider.id === preferredProviderId,
  )
  if (isRunnableProvider(preferred)) return preferred
  const localProvider = LOCAL_FALLBACK_ORDER
    .map((providerId) =>
      settings.providers.find((provider) => provider.id === providerId),
    )
    .find(isRunnableProvider)
  return localProvider ?? settings.providers.find(isRunnableProvider)
}

function isRunnableProvider(provider) {
  if (!provider?.enabled || !SUPPORTED_PROVIDER_IDS.has(provider.id)) return false
  if (!API_KEY_PROVIDER_IDS.has(provider.id)) return true
  return Array.isArray(provider.apiKeys) && provider.apiKeys.some((key) => key.trim())
}

async function readJsonResponse(response) {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(parseResponseError(text) || response.statusText)
  }
  return JSON.parse(text)
}

function extractAssistantContent(payload) {
  return (
    normalizeContentText(payload?.choices?.[0]?.message?.content) ||
    normalizeContentText(payload?.choices?.[0]?.text) ||
    normalizeContentText(payload?.output_text)
  )
}

function normalizeContentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (typeof part?.text === 'string') return part.text
      if (typeof part?.content === 'string') return part.content
      return ''
    })
    .join('')
}

function parseResponseError(text) {
  try {
    const payload = JSON.parse(text)
    if (typeof payload.error === 'string') return payload.error
    return payload.error?.message || payload.message || ''
  } catch {
    return text
  }
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
