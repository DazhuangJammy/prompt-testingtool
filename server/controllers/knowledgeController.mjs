const MAX_REMOTE_TEXT_BYTES = 8 * 1024 * 1024
const REMOTE_FETCH_TIMEOUT_MS = 15000

export const fetchKnowledgeUrl = async (req, res) => {
  const { url } = req.body ?? {}
  const target = parseRemoteUrl(url)

  if (!target) {
    res.status(400).json({ error: 'Invalid URL' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml,text/plain,*/*;q=0.8',
        'user-agent': 'PromptKnowledgeTool/1.0',
      },
    })

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `Fetch failed: ${upstream.status}`,
      })
      return
    }

    const contentLength = Number(upstream.headers.get('content-length') ?? 0)
    if (contentLength > MAX_REMOTE_TEXT_BYTES) {
      res.status(413).json({ error: 'Remote content is too large' })
      return
    }

    const text = await readLimitedText(upstream, MAX_REMOTE_TEXT_BYTES)
    res.json({
      url: upstream.url || target.toString(),
      contentType: upstream.headers.get('content-type') ?? '',
      text,
    })
  } catch (error) {
    const status = error?.statusCode === 413 ? 413 : 502
    res.status(status).json({
      error: error instanceof Error ? error.message : 'Fetch failed',
    })
  } finally {
    clearTimeout(timeout)
  }
}

function parseRemoteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url
  } catch {
    return undefined
  }
}

async function readLimitedText(response, maxBytes) {
  if (!response.body) return response.text()

  const reader = response.body.getReader()
  const chunks = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined)
      const error = new Error('Remote content is too large')
      error.statusCode = 413
      throw error
    }
    chunks.push(Buffer.from(value))
  }

  return Buffer.concat(chunks).toString('utf8')
}
