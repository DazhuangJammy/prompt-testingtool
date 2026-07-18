import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  connectBailianKnowledge,
  deleteBailianKnowledgeDocuments,
  listBailianKnowledgeDocuments,
  retrieveBailianKnowledge,
  uploadBailianKnowledgeDocuments,
} from '@/shared/api/bailianKnowledge'
import type { KnowledgeBase, KnowledgeItem } from '@/shared/types'
import { BailianKnowledgeProvider } from './bailianKnowledgeProvider'
import { knowledgeRepository } from './knowledgeRepository'

vi.mock('@/shared/api/bailianKnowledge', () => ({
  connectBailianKnowledge: vi.fn(),
  deleteBailianKnowledgeDocuments: vi.fn(),
  listBailianKnowledgeDocuments: vi.fn(),
  retrieveBailianKnowledge: vi.fn(),
  uploadBailianKnowledgeDocuments: vi.fn(),
}))

vi.mock('@/shared/utils/identity', () => ({
  createId: () => 'local-base',
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: () => '2026-01-01T00:00:00.000Z',
}))

vi.mock('./knowledgeRepository', () => ({
  knowledgeRepository: {
    deleteBaseCascade: vi.fn(),
    getBase: vi.fn(),
    getItem: vi.fn(),
    replaceBaseItems: vi.fn(),
    saveBase: vi.fn(),
  },
}))

const connection = {
  accessKeyId: 'access-id',
  accessKeySecret: 'access-secret',
  workspaceId: 'workspace',
}

const base: KnowledgeBase = {
  id: 'local-base',
  name: '百炼库',
  providerType: 'bailian',
  externalBaseId: 'remote-base',
  bailian: connection,
  config: {
    chunkOverlap: 100,
    chunkSize: 800,
    rerankEnabled: true,
    threshold: 0.2,
    topK: 5,
  },
  createdAt: 'now',
  updatedAt: 'now',
}

const remoteDocuments = [{
  id: 'remote-document',
  name: '产品手册.pdf',
  size: 2048,
  type: 'pdf',
  status: 'FINISH',
  updatedAt: '2026-01-01T00:00:00.000Z',
}]

describe('BailianKnowledgeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(knowledgeRepository.getBase).mockResolvedValue(base)
    vi.mocked(connectBailianKnowledge).mockResolvedValue({
      knowledgeBase: { id: 'remote-base', name: '远程名称' },
      documents: remoteDocuments,
    })
    vi.mocked(knowledgeRepository.replaceBaseItems).mockResolvedValue(undefined)
  })

  it('connects an existing remote base and caches its documents', async () => {
    const provider = new BailianKnowledgeProvider()
    const created = await provider.createBase({
      name: '',
      providerType: 'bailian',
      externalBaseId: 'remote-base',
      bailian: connection,
    })

    expect(created).toMatchObject({
      id: 'local-base',
      name: '远程名称',
      providerType: 'bailian',
      externalBaseId: 'remote-base',
    })
    expect(knowledgeRepository.saveBase).toHaveBeenCalledWith(created)
    expect(knowledgeRepository.replaceBaseItems).toHaveBeenCalledWith(
      'local-base',
      [expect.objectContaining({
        id: 'bailian:local-base:remote-document',
        externalDocumentId: 'remote-document',
        status: 'completed',
      })],
    )
  })

  it('uploads files and deletes documents by their remote IDs', async () => {
    const provider = new BailianKnowledgeProvider()
    const file = new File(['data'], '产品手册.pdf', { type: 'application/pdf' })
    vi.mocked(uploadBailianKnowledgeDocuments).mockResolvedValue(remoteDocuments)
    vi.mocked(deleteBailianKnowledgeDocuments).mockResolvedValue([])
    vi.mocked(knowledgeRepository.getItem).mockResolvedValue({
      id: 'local-document',
      baseId: 'local-base',
      sourceType: 'file',
      title: '产品手册.pdf',
      status: 'completed',
      externalDocumentId: 'remote-document',
      createdAt: 'now',
      updatedAt: 'now',
    } satisfies KnowledgeItem)

    await provider.addItems('local-base', [{ sourceType: 'file', title: file.name, file }])
    await provider.deleteItems('local-base', ['local-document'])

    expect(uploadBailianKnowledgeDocuments).toHaveBeenCalledWith(
      connection,
      'remote-base',
      [file],
    )
    expect(deleteBailianKnowledgeDocuments).toHaveBeenCalledWith(
      connection,
      'remote-base',
      ['remote-document'],
    )
  })

  it('syncs remote status and maps retrieval results', async () => {
    const provider = new BailianKnowledgeProvider()
    vi.mocked(listBailianKnowledgeDocuments).mockResolvedValue([{
      ...remoteDocuments[0],
      status: 'RUNNING',
    }])
    vi.mocked(retrieveBailianKnowledge).mockResolvedValue([{
      chunkId: 'chunk-1',
      content: '百炼召回内容',
      documentId: 'remote-document',
      documentName: '产品手册.pdf',
      score: 0.9,
    }])

    const synced = await provider.syncItems('local-base')
    const results = await provider.search({ baseIds: ['local-base'], query: '产品' })

    expect(synced[0].status).toBe('processing')
    expect(results[0]).toMatchObject({
      itemId: 'remote-document',
      itemTitle: '产品手册.pdf',
      content: '百炼召回内容',
      score: 0.9,
    })
    expect(retrieveBailianKnowledge).toHaveBeenCalledWith(expect.objectContaining({
      knowledgeBaseId: 'remote-base',
      rerankEnabled: true,
      threshold: 0.2,
      topK: 5,
    }))
  })

  it('validates and saves updated remote settings', async () => {
    const provider = new BailianKnowledgeProvider()
    const nextConnection = { ...connection, workspaceId: 'next-workspace' }

    const updated = await provider.updateBase('local-base', {
      name: '  新名称  ',
      externalBaseId: 'next-remote-base',
      bailian: nextConnection,
      config: { ...base.config, topK: 3 },
    })

    expect(connectBailianKnowledge).toHaveBeenCalledWith({
      connection: nextConnection,
      knowledgeBaseId: 'next-remote-base',
    })
    expect(updated).toMatchObject({
      name: '新名称',
      externalBaseId: 'next-remote-base',
      bailian: nextConnection,
      config: { topK: 3 },
    })
  })

  it('rejects unsupported inputs and missing bases', async () => {
    const provider = new BailianKnowledgeProvider()

    await expect(provider.addItems('local-base', [{
      sourceType: 'note',
      title: '笔记',
      text: '内容',
    }])).rejects.toThrow('只支持上传文件')
    vi.mocked(knowledgeRepository.getBase).mockResolvedValue(undefined)
    await expect(provider.syncItems('missing')).rejects.toThrow('知识库不存在')
    await expect(provider.createBase({
      name: '无凭据',
      providerType: 'bailian',
    })).rejects.toThrow('请填写AccessKey ID')
  })

  it('removes only the local connection when deleting a base', async () => {
    const provider = new BailianKnowledgeProvider()

    await provider.deleteBase('local-base')

    expect(knowledgeRepository.deleteBaseCascade).toHaveBeenCalledWith('local-base')
    expect(deleteBailianKnowledgeDocuments).not.toHaveBeenCalled()
  })
})
