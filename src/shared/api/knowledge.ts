export interface RemoteKnowledgeText {
  url: string
  contentType: string
  text: string
}

export async function fetchKnowledgeRemoteText(url: string): Promise<RemoteKnowledgeText> {
  const response = await fetch('/api/knowledge/fetch-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (RemoteKnowledgeText & { error?: string })
    | null

  if (!response.ok || !payload) {
    throw new Error(payload?.error || '读取网址失败')
  }

  if (typeof payload.text !== 'string') {
    throw new Error('网址返回内容无效')
  }

  return {
    url: payload.url || url,
    contentType: payload.contentType || '',
    text: payload.text,
  }
}
