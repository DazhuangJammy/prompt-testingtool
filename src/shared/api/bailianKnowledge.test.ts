import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  connectBailianKnowledge,
  deleteBailianKnowledgeDocuments,
  listBailianKnowledgeDocuments,
  retrieveBailianKnowledge,
  uploadBailianKnowledgeDocuments,
} from './bailianKnowledge'

const connection = {
  accessKeyId: 'access-id',
  accessKeySecret: 'access-secret',
  workspaceId: 'workspace',
}

describe('Bailian knowledge API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('connects and lists remote knowledge documents', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        knowledgeBase: { id: 'remote-base', name: '百炼库' },
        documents: [],
      }))
      .mockResolvedValueOnce(jsonResponse([{ id: 'document', name: '资料.pdf' }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(connectBailianKnowledge({
      connection,
      knowledgeBaseId: 'remote-base',
    })).resolves.toMatchObject({ knowledgeBase: { id: 'remote-base' } })
    await expect(listBailianKnowledgeDocuments(connection, 'remote-base')).resolves.toEqual([
      { id: 'document', name: '资料.pdf' },
    ])

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/knowledge/bailian/connect',
      expect.objectContaining({
        body: expect.stringContaining('access-secret'),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('uploads files as multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['content'], '资料.pdf', { type: 'application/pdf' })

    await uploadBailianKnowledgeDocuments(connection, 'remote-base', [file])

    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(request.headers).toBeUndefined()
    expect(request.body).toBeInstanceOf(FormData)
    expect((request.body as FormData).get('knowledgeBaseId')).toBe('remote-base')
    expect((request.body as FormData).getAll('files')).toHaveLength(1)
  })

  it('deletes documents and retrieves chunks', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([{
        chunkId: 'chunk',
        content: '召回内容',
        documentId: 'document',
        documentName: '资料.pdf',
        score: 0.9,
      }]))
    vi.stubGlobal('fetch', fetchMock)

    await deleteBailianKnowledgeDocuments(connection, 'remote-base', ['document'])
    const results = await retrieveBailianKnowledge({
      connection,
      knowledgeBaseId: 'remote-base',
      query: '问题',
      topK: 5,
      threshold: 0.2,
      rerankEnabled: true,
    })

    expect(results[0]).toMatchObject({ chunkId: 'chunk', score: 0.9 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/knowledge/bailian/documents/delete')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/knowledge/bailian/retrieve')
  })

  it('surfaces remote and invalid-response errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: '凭据无效' }, 502))
      .mockResolvedValueOnce(new Response('not-json', { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listBailianKnowledgeDocuments(connection, 'remote-base'))
      .rejects.toThrow('凭据无效')
    await expect(listBailianKnowledgeDocuments(connection, 'remote-base'))
      .rejects.toThrow('阿里百炼请求失败')
  })
})

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
