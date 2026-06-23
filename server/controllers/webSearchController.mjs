import { checkWebSearch, searchWeb } from '../services/webSearchService.mjs'

export const runWebSearch = async (req, res) => {
  const { provider, query, settings } = req.body ?? {}
  if (!provider?.id || !query) {
    res.status(400).json({ error: 'Invalid web search request' })
    return
  }

  const controller = new AbortController()
  const abortOnClose = () => controller.abort()
  res.on('close', abortOnClose)

  try {
    const response = await searchWeb({
      provider,
      query,
      settings,
      signal: controller.signal,
    })
    res.json(response)
  } catch (error) {
    if (isAbortError(error)) return
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Web search failed',
    })
  } finally {
    res.off('close', abortOnClose)
  }
}

export const checkWebSearchProvider = async (req, res) => {
  const { provider, settings } = req.body ?? {}
  if (!provider?.id) {
    res.status(400).json({ ok: false, error: 'Invalid web search provider' })
    return
  }

  const controller = new AbortController()
  try {
    await checkWebSearch({ provider, settings, signal: controller.signal })
    res.json({ ok: true, message: '检测成功' })
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Web search check failed',
    })
  }
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError'
}
