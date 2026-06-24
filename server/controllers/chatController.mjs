import {
  parseUpstreamError,
  requestChatCompletion,
  requestEmbeddings,
  requestModelList,
  requestRerank,
} from '../services/openaiCompatibleService.mjs'
import {
  runWebSearchToolLoop,
  shouldUseWebSearchTools,
  webSearchToolDefinition,
} from '../services/webSearchToolService.mjs'

export const proxyChatCompletion = async (req, res) => {
  const {
    provider,
    model,
    messages,
    stream = false,
    temperature = 0.7,
    thinkingMode = 'off',
    webSearch,
  } = req.body ?? {}

  if (!provider?.baseUrl || !provider?.apiKey) {
    res.status(400).json({ error: 'Provider missing' })
    return
  }

  if (!model || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Invalid request' })
    return
  }

  const controller = new AbortController()
  let completed = false
  res.on('close', () => {
    if (!completed) controller.abort()
  })

  try {
    const useWebSearchTools = shouldUseWebSearchTools(webSearch)
    if (useWebSearchTools && stream) {
      prepareSseResponse(res)
      writeSseEvent(res, {
        webSearchStatus: {
          phase: 'preparing',
          message: '准备联网搜索',
        },
      })
    }
    const upstream = await requestChatCompletion({
      provider,
      model,
      messages,
      signal: controller.signal,
      stream: stream && !useWebSearchTools,
      temperature,
      thinkingMode,
      ...(useWebSearchTools
        ? { tools: [webSearchToolDefinition], toolChoice: 'auto' }
        : {}),
    })

    if (useWebSearchTools) {
      const result = await runWebSearchToolLoop({
        finalStream: stream,
        initialResponse: upstream,
        onEvent: stream ? (event) => writeSseEvent(res, event) : undefined,
        requestChatCompletion,
        requestOptions: {
          provider,
          model,
          messages,
          signal: controller.signal,
          stream: false,
          temperature,
          thinkingMode,
        },
        webSearch,
      })
      if (stream) await sendToolLoopStream(result, res)
      else await sendToolLoopJson(result, res)
    } else {
      await forwardUpstreamResponse(upstream, res, stream)
    }
    completed = true
  } catch (error) {
    if (isAbortError(error)) return
    if (res.headersSent) {
      writeSseEvent(res, {
        error: error instanceof Error ? error.message : 'Proxy failed',
      })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Proxy failed',
    })
  }
}

const sendToolLoopJson = async ({ response, references }, res) => {
  const text = await response.text()
  const payload = JSON.parse(text)
  payload.webSearchReferences = references
  res.status(response.status)
  res.type('application/json')
  res.send(JSON.stringify(payload))
}

const sendToolLoopStream = async ({ response, references }, res) => {
  prepareSseResponse(res)
  if (references.length) {
    writeSseEvent(res, { webSearchReferences: references })
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream') && response.body) {
    await pipeReadableStream(response.body, res)
    return
  }

  const text = await response.text()
  const payload = JSON.parse(text)
  const content = extractAssistantContent(payload)
  if (content) {
    writeSseEvent(res, { choices: [{ delta: { content } }] })
  }
  res.write('data: [DONE]\n\n')
  res.end()
}

const prepareSseResponse = (res) => {
  if (res.headersSent) return
  res.status(200)
  res.type('text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders?.()
}

const writeSseEvent = (res, payload) => {
  if (res.destroyed) return
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const extractAssistantContent = (payload) =>
  payload?.choices?.[0]?.message?.content ??
  payload?.choices?.[0]?.text ??
  payload?.output_text ??
  ''

const forwardUpstreamResponse = async (upstream, res, shouldStream) => {
  res.status(upstream.status)
  res.type(upstream.headers.get('content-type') ?? 'application/json')

  if (!shouldStream || !upstream.body) {
    res.send(await upstream.text())
    return
  }

  res.flushHeaders?.()
  await pipeReadableStream(upstream.body, res)
}

const pipeReadableStream = async (body, res) => {
  const reader = body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (res.destroyed) {
      await reader.cancel().catch(() => undefined)
      break
    }
    res.write(Buffer.from(value))
  }

  res.end()
}

const isAbortError = (error) =>
  error instanceof DOMException && error.name === 'AbortError'

export const testProvider = async (req, res) => {
  const { provider, model } = req.body ?? {}

  if (!provider?.baseUrl || !provider?.apiKey || !model) {
    res.status(400).json({ ok: false, error: 'Provider incomplete' })
    return
  }

  try {
    const upstream = await requestChatCompletion({
      provider,
      model,
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 8,
      temperature: 0,
    })
    const text = await upstream.text()

    if (!upstream.ok) {
      res.status(upstream.status).json({
        ok: false,
        error: parseUpstreamError(text) || upstream.statusText,
        status: upstream.status,
      })
      return
    }

    res.json({ ok: true, message: '测试成功' })
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Test failed',
    })
  }
}

export const listProviderModels = async (req, res) => {
  const { provider } = req.body ?? {}

  if (!provider?.baseUrl || !provider?.apiKey) {
    res.status(400).json({ ok: false, error: 'Provider incomplete' })
    return
  }

  try {
    const upstream = await requestModelList({ provider })
    const text = await upstream.text()

    if (!upstream.ok) {
      res.status(upstream.status).json({
        ok: false,
        error: parseUpstreamError(text) || upstream.statusText,
        status: upstream.status,
      })
      return
    }

    const payload = JSON.parse(text)
    const models = normalizeModelList(payload)
    res.json({ ok: true, models })
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Fetch models failed',
    })
  }
}

export const createEmbeddings = async (req, res) => {
  const { provider, model, input } = req.body ?? {}

  if (!provider?.baseUrl || !provider?.apiKey || !model) {
    res.status(400).json({ error: 'Provider incomplete' })
    return
  }

  if (!Array.isArray(input) && typeof input !== 'string') {
    res.status(400).json({ error: 'Invalid embedding input' })
    return
  }

  try {
    const upstream = await requestEmbeddings({ provider, model, input })
    const text = await upstream.text()

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: parseUpstreamError(text) || upstream.statusText,
        status: upstream.status,
      })
      return
    }

    res.type(upstream.headers.get('content-type') ?? 'application/json')
    res.send(text)
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Embedding failed',
    })
  }
}

export const rerankDocuments = async (req, res) => {
  const { provider, model, query, documents, topN } = req.body ?? {}

  if (!provider?.baseUrl || !provider?.apiKey || !model) {
    res.status(400).json({ error: 'Provider incomplete' })
    return
  }

  if (!query || !Array.isArray(documents)) {
    res.status(400).json({ error: 'Invalid rerank input' })
    return
  }

  try {
    const upstream = await requestRerank({
      provider,
      model,
      query,
      documents,
      topN,
    })
    const text = await upstream.text()

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: parseUpstreamError(text) || upstream.statusText,
        status: upstream.status,
      })
      return
    }

    res.type(upstream.headers.get('content-type') ?? 'application/json')
    res.send(text)
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Rerank failed',
    })
  }
}

const normalizeModelList = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
        ? payload.models
        : []

  return source
    .map((item) => {
      if (typeof item === 'string') return { id: item, name: item }
      const id = item?.id ?? item?.name ?? item?.model
      if (!id) return undefined
      return {
        id: String(id),
        name: item?.name ? String(item.name) : undefined,
      }
    })
    .filter(Boolean)
}
