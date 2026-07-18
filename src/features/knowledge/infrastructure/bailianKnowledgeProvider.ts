import {
  connectBailianKnowledge,
  deleteBailianKnowledgeDocuments,
  listBailianKnowledgeDocuments,
  retrieveBailianKnowledge,
  uploadBailianKnowledgeDocuments,
  type BailianRemoteDocument,
} from '@/shared/api/bailianKnowledge'
import type {
  KnowledgeBase,
  KnowledgeItem,
  KnowledgeSearchResult,
} from '@/shared/types'
import type { BailianKnowledgeConnection } from '@/shared/knowledge.types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import { normalizeKnowledgeConfig, rankKnowledgeResults } from '../model/knowledge'
import type {
  KnowledgeAddItemInput,
  KnowledgeCreateBaseInput,
  KnowledgeProvider,
  KnowledgeSearchInput,
} from '../model/knowledgeProvider'
import { knowledgeRepository } from './knowledgeRepository'

export class BailianKnowledgeProvider implements KnowledgeProvider {
  async createBase(input: KnowledgeCreateBaseInput) {
    const connection = requireConnection(input.bailian)
    const externalBaseId = requireText(input.externalBaseId, '知识库 ID')
    const remote = await connectBailianKnowledge({ connection, knowledgeBaseId: externalBaseId })
    const at = nowIso()
    const base: KnowledgeBase = {
      id: createId(),
      name: input.name.trim() || remote.knowledgeBase.name,
      providerType: 'bailian',
      externalBaseId,
      bailian: connection,
      config: normalizeKnowledgeConfig(input.config),
      createdAt: at,
      updatedAt: at,
    }
    await knowledgeRepository.saveBase(base)
    await this.replaceRemoteItems(base.id, remote.documents)
    return base
  }

  async updateBase(
    baseId: string,
    updates: Partial<Pick<KnowledgeBase, 'name' | 'config' | 'externalBaseId' | 'bailian'>>,
  ) {
    const base = await requireBailianBase(baseId)
    const connection = requireConnection(updates.bailian ?? base.bailian)
    const externalBaseId = requireText(
      updates.externalBaseId ?? base.externalBaseId,
      '知识库 ID',
    )
    const remote = await connectBailianKnowledge({ connection, knowledgeBaseId: externalBaseId })
    const next: KnowledgeBase = {
      ...base,
      name: updates.name?.trim() || base.name,
      externalBaseId,
      bailian: connection,
      config: updates.config
        ? normalizeKnowledgeConfig({ ...base.config, ...updates.config })
        : base.config,
      updatedAt: nowIso(),
    }
    await knowledgeRepository.saveBase(next)
    await this.replaceRemoteItems(base.id, remote.documents)
    return next
  }

  async deleteBase(baseId: string) {
    await knowledgeRepository.deleteBaseCascade(baseId)
  }

  async addItems(baseId: string, items: KnowledgeAddItemInput[]) {
    const base = await requireBailianBase(baseId)
    const files = items.flatMap((item) => item.files ?? (item.file ? [item.file] : []))
    if (!files.length) throw new Error('阿里百炼知识库目前只支持上传文件')
    const documents = await uploadBailianKnowledgeDocuments(
      requireConnection(base.bailian),
      requireText(base.externalBaseId, '知识库 ID'),
      files,
    )
    return this.replaceRemoteItems(base.id, documents)
  }

  async deleteItems(baseId: string, itemIds: string[]) {
    const base = await requireBailianBase(baseId)
    const items = await Promise.all(itemIds.map((itemId) => knowledgeRepository.getItem(itemId)))
    const documentIds = items.flatMap((item) => item?.externalDocumentId ? [item.externalDocumentId] : [])
    const documents = await deleteBailianKnowledgeDocuments(
      requireConnection(base.bailian),
      requireText(base.externalBaseId, '知识库 ID'),
      documentIds,
    )
    await this.replaceRemoteItems(base.id, documents)
  }

  async reindexItems(baseId: string) {
    await this.syncItems(baseId)
  }

  async search(input: KnowledgeSearchInput) {
    const results = await Promise.all(
      input.baseIds.map((baseId) => this.searchBase(baseId, input)),
    )
    const firstBase = input.baseIds.length === 1
      ? await knowledgeRepository.getBase(input.baseIds[0])
      : undefined
    return rankKnowledgeResults(results.flat(), {
      topK: input.config?.topK ?? firstBase?.config.topK ?? 6,
      threshold: input.config?.threshold ?? firstBase?.config.threshold ?? 0.18,
    })
  }

  async listChunks() {
    return []
  }

  async syncItems(baseId: string) {
    const base = await requireBailianBase(baseId)
    const documents = await listBailianKnowledgeDocuments(
      requireConnection(base.bailian),
      requireText(base.externalBaseId, '知识库 ID'),
    )
    return this.replaceRemoteItems(base.id, documents)
  }

  private async searchBase(baseId: string, input: KnowledgeSearchInput) {
    const base = await requireBailianBase(baseId)
    const config = {
      ...base.config,
      ...input.config,
    }
    const results = await retrieveBailianKnowledge({
      connection: requireConnection(base.bailian),
      knowledgeBaseId: requireText(base.externalBaseId, '知识库 ID'),
      query: input.query,
      topK: config.topK,
      threshold: config.threshold,
      rerankEnabled: config.rerankEnabled,
    })
    return results.map<KnowledgeSearchResult>((result, index) => ({
      baseId,
      itemId: result.documentId || `bailian-result-${index}`,
      itemTitle: result.documentName,
      chunkId: result.chunkId,
      chunkIndex: index,
      content: result.content,
      score: result.score,
    }))
  }

  private async replaceRemoteItems(baseId: string, documents: BailianRemoteDocument[]) {
    const items = documents
      .filter((document) => document.status !== 'DELETED')
      .map((document) => mapRemoteDocument(baseId, document))
    await knowledgeRepository.replaceBaseItems(baseId, items)
    return items
  }
}

function mapRemoteDocument(baseId: string, document: BailianRemoteDocument): KnowledgeItem {
  const externalDocumentId = requireText(document.id, '远程文件 ID')
  const status = mapRemoteStatus(document.status)
  return {
    id: `bailian:${baseId}:${externalDocumentId}`,
    baseId,
    sourceType: 'file',
    title: document.name,
    status,
    mimeType: document.type,
    size: document.size,
    externalDocumentId,
    error: status === 'failed' ? document.error || `百炼状态：${document.status}` : undefined,
    metadata: { remoteStatus: document.status ?? '' },
    createdAt: document.updatedAt,
    updatedAt: document.updatedAt,
  }
}

function mapRemoteStatus(status?: string): KnowledgeItem['status'] {
  if (status === 'FINISH') return 'completed'
  if (status === 'INSERT_ERROR' || status === 'PARSE_FAILED') return 'failed'
  if (status === 'DELETED') return 'deleting'
  return 'processing'
}

function requireConnection(connection?: BailianKnowledgeConnection) {
  return {
    accessKeyId: requireText(connection?.accessKeyId, 'AccessKey ID'),
    accessKeySecret: requireText(connection?.accessKeySecret, 'AccessKey Secret'),
    workspaceId: requireText(connection?.workspaceId, '业务空间 ID'),
  }
}

async function requireBailianBase(baseId: string) {
  const base = await knowledgeRepository.getBase(baseId)
  if (!base || base.providerType !== 'bailian') throw new Error('阿里百炼知识库不存在')
  return base
}

function requireText(value: string | undefined, label: string) {
  const text = value?.trim()
  if (!text) throw new Error(`请填写${label}`)
  return text
}
