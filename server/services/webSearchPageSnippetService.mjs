const PAGE_SNIPPET_TIMEOUT_MS = 3500

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

export async function fetchPageSnippet(url, { signal } = {}) {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), PAGE_SNIPPET_TIMEOUT_MS)
  const requestSignal = anySignal([signal, timeoutController.signal])

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: requestSignal,
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.6',
        'user-agent': USER_AGENT,
      },
    })
    if (!response.ok) throw new Error(`Fetch page failed: ${response.status}`)
    const contentType = response.headers.get('content-type') ?? ''
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
      return { url: response.url || String(url), content: '' }
    }
    const text = await response.text()
    return {
      url: response.url || String(url),
      content: extractReadableSnippet(text),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function extractReadableSnippet(html) {
  const text = normalizeText(
    decodeHtml(
      String(html ?? '')
        .replace(/<head[\s\S]*?<\/head>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<header[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  )
  return text.slice(0, 900)
}

function anySignal(signals) {
  const activeSignals = signals.filter(Boolean)
  if (!activeSignals.length) return undefined
  const controller = new AbortController()
  const abort = () => controller.abort()
  activeSignals.forEach((activeSignal) => {
    if (activeSignal.aborted) abort()
    else activeSignal.addEventListener('abort', abort, { once: true })
  })
  return controller.signal
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}
