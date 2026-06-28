export interface ExtractDocumentTextResponse {
  text: string
}

export async function extractLegacyWordText(file: File): Promise<string> {
  const response = await fetch('/api/documents/extract-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/msword',
      dataBase64: arrayBufferToBase64(await file.arrayBuffer()),
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (ExtractDocumentTextResponse & { error?: string })
    | null

  if (!response.ok || !payload) {
    throw new Error(payload?.error || '读取 Word 文档失败')
  }

  if (typeof payload.text !== 'string') {
    throw new Error('Word 文档返回内容无效')
  }

  return payload.text
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
