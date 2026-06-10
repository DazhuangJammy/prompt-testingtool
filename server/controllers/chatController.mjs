import {
  parseUpstreamError,
  requestChatCompletion,
} from '../services/openaiCompatibleService.mjs'

export const proxyChatCompletion = async (req, res) => {
  const {
    provider,
    model,
    messages,
    stream = false,
    temperature = 0.7,
    thinkingMode = 'off',
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
    const upstream = await requestChatCompletion({
      provider,
      model,
      messages,
      signal: controller.signal,
      stream,
      temperature,
      thinkingMode,
    })

    await forwardUpstreamResponse(upstream, res, stream)
    completed = true
  } catch (error) {
    if (isAbortError(error)) return
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Proxy failed',
    })
  }
}

const forwardUpstreamResponse = async (upstream, res, shouldStream) => {
  res.status(upstream.status)
  res.type(upstream.headers.get('content-type') ?? 'application/json')

  if (!shouldStream || !upstream.body) {
    res.send(await upstream.text())
    return
  }

  const reader = upstream.body.getReader()
  res.flushHeaders?.()

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
