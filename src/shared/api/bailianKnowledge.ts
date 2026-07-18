import type { BailianKnowledgeConnection } from '@/shared/knowledge.types'

export interface BailianRemoteDocument {
  id?: string
  name: string
  size?: number
  type?: string
  status?: string
  error?: string
  updatedAt: string
}

export interface BailianRemoteSearchResult {
  chunkId: string
  content: string
  documentId: string
  documentName: string
  score: number
}

export async function connectBailianKnowledge(input: {
  connection: BailianKnowledgeConnection
  knowledgeBaseId: string
}) {
  return requestBailian<{
    knowledgeBase: { id: string; name: string }
    documents: BailianRemoteDocument[]
  }>('/api/knowledge/bailian/connect', input)
}

export async function listBailianKnowledgeDocuments(
  connection: BailianKnowledgeConnection,
  knowledgeBaseId: string,
) {
  return requestBailian<BailianRemoteDocument[]>('/api/knowledge/bailian/documents', {
    connection,
    knowledgeBaseId,
  })
}

export async function uploadBailianKnowledgeDocuments(
  connection: BailianKnowledgeConnection,
  knowledgeBaseId: string,
  files: File[],
) {
  const form = new FormData()
  form.set('connection', JSON.stringify(connection))
  form.set('knowledgeBaseId', knowledgeBaseId)
  files.forEach((file) => form.append('files', file, file.name))
  return requestBailian<BailianRemoteDocument[]>(
    '/api/knowledge/bailian/documents/upload',
    form,
  )
}

export async function deleteBailianKnowledgeDocuments(
  connection: BailianKnowledgeConnection,
  knowledgeBaseId: string,
  documentIds: string[],
) {
  return requestBailian<BailianRemoteDocument[]>(
    '/api/knowledge/bailian/documents/delete',
    { connection, documentIds, knowledgeBaseId },
  )
}

export async function retrieveBailianKnowledge(input: {
  connection: BailianKnowledgeConnection
  knowledgeBaseId: string
  query: string
  topK: number
  threshold: number
  rerankEnabled: boolean
}) {
  return requestBailian<BailianRemoteSearchResult[]>(
    '/api/knowledge/bailian/retrieve',
    input,
  )
}

async function requestBailian<T>(url: string, body: FormData | object): Promise<T> {
  const isForm = body instanceof FormData
  const response = await fetch(url, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null
  if (!response.ok || !payload) {
    throw new Error(payload?.error || '阿里百炼请求失败')
  }
  return payload
}
