import { requestEmbeddings, requestRerank } from '@/shared/api/ai'
import type {
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
  KnowledgeSearchResult,
  ProviderConfig,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  cosineSimilarity,
  createKnowledgeBase,
  createKnowledgeChunks,
  createKnowledgeItem,
  normalizeKnowledgeConfig,
  rankKnowledgeResults,
} from '../model/knowledge'
import type {
  KnowledgeAddItemInput,
  KnowledgeProvider,
  KnowledgeSearchInput,
} from '../model/knowledgeProvider'
import { fetchSitemapUrls, fetchUrlText, parseKnowledgeFile } from './documentParser'
import { knowledgeRepository } from './knowledgeRepository'

const embeddingBatchSize = 10

export class LocalKnowledgeProvider implements KnowledgeProvider {
  private readonly getProviders: () => Promise<ProviderConfig[]>

  constructor(getProviders: () => Promise<ProviderConfig[]>) {
    this.getProviders = getProviders
  }

  async createBase(input: {
    name: string
    config?: Partial<KnowledgeBase['config']>
  }) {
    const base = createKnowledgeBase(input)
    await knowledgeRepository.saveBase(base)
    return base
  }

  async updateBase(
    baseId: string,
    updates: Partial<Pick<KnowledgeBase, 'name' | 'config'>>,
  ) {
    const base = await requireBase(baseId)
    const next: KnowledgeBase = {
      ...base,
      name: updates.name?.trim() || base.name,
      config: updates.config
        ? normalizeKnowledgeConfig({ ...base.config, ...updates.config })
        : base.config,
      updatedAt: nowIso(),
    }
    await knowledgeRepository.saveBase(next)
    return next
  }

  async deleteBase(baseId: string) {
    await knowledgeRepository.deleteBaseCascade(baseId)
  }

  async addItems(baseId: string, items: KnowledgeAddItemInput[]) {
    const base = await requireBase(baseId)
    const expandedItems = await expandInputs(baseId, items)
    const knowledgeItems = expandedItems.map((item) =>
      createKnowledgeItem({
        baseId,
        sourceType: item.sourceType,
        title: item.title,
        mimeType: item.mimeType,
        size: item.size,
        sourceUri: item.sourceUri,
        text: item.text,
        metadata: item.metadata,
      }),
    )
    await knowledgeRepository.saveItems(knowledgeItems)
    await this.indexItems(base, knowledgeItems)
    return knowledgeItems
  }

  async deleteItems(baseId: string, itemIds: string[]) {
    await knowledgeRepository.deleteItems(baseId, itemIds)
  }

  async reindexItems(baseId: string, itemIds?: string[]) {
    const base = await requireBase(baseId)
    const items = await knowledgeRepository.listItems(baseId)
    await this.indexItems(
      base,
      itemIds?.length ? items.filter((item) => itemIds.includes(item.id)) : items,
    )
  }

  async search(input: KnowledgeSearchInput) {
    const query = input.query.trim()
    if (!query || !input.baseIds.length) return []

    const baseResults = await Promise.all(
      input.baseIds.map((baseId) => this.searchBase(baseId, query, input.config)),
    )
    const results = baseResults.flat()
    const base = input.baseIds.length === 1 ? await knowledgeRepository.getBase(input.baseIds[0]) : undefined
    const config = {
      topK: input.config?.topK ?? base?.config.topK ?? 6,
      threshold: input.config?.threshold ?? base?.config.threshold ?? 0.18,
    }

    return rankKnowledgeResults(results, config)
  }

  async listChunks(baseId: string, itemId: string) {
    return knowledgeRepository.listChunks(baseId, itemId)
  }

  private async indexItems(base: KnowledgeBase, items: KnowledgeItem[]) {
    for (const item of items) {
      await this.indexItem(base, item)
    }
  }

  private async indexItem(base: KnowledgeBase, item: KnowledgeItem) {
    await knowledgeRepository.updateItem(item.id, {
      status: 'embedding',
      error: undefined,
      updatedAt: nowIso(),
    })

    try {
      const chunks = createKnowledgeChunks(item, item.text ?? '', base.config)
      const embeddedChunks = await this.embedChunks(base, chunks)
      await knowledgeRepository.replaceItemChunks(base.id, item.id, embeddedChunks)
      await knowledgeRepository.updateItem(item.id, {
        status: 'completed',
        updatedAt: nowIso(),
      })
    } catch (error) {
      await knowledgeRepository.updateItem(item.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '索引失败',
        updatedAt: nowIso(),
      })
    }
  }

  private async embedChunks(base: KnowledgeBase, chunks: KnowledgeChunk[]) {
    if (!chunks.length) return chunks
    const provider = await this.resolveModelProvider(
      base.config.embeddingProviderId,
      base.config.embeddingModel,
      '请先在知识库设置里选择可用的嵌入模型',
    )
    const embeddings = await embedTextsInBatches(
      provider,
      base.config.embeddingModel || provider.model,
      chunks.map((chunk) => chunk.content),
    )

    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    }))
  }

  private async searchBase(
    baseId: string,
    query: string,
    configOverride: KnowledgeSearchInput['config'] = {},
  ) {
    const base = await requireBase(baseId)
    const provider = await this.resolveModelProvider(
      base.config.embeddingProviderId,
      base.config.embeddingModel,
      '请先在知识库设置里选择可用的嵌入模型',
    )
    const [queryEmbedding] = await requestEmbeddings(
      provider,
      base.config.embeddingModel || provider.model,
      [query],
    )
    const chunks = await knowledgeRepository.listChunksByBase(baseId)
    const completedItems = (await knowledgeRepository.listItems(baseId))
      .filter((item) => item.status === 'completed')
    const itemById = new Map(completedItems.map((item) => [item.id, item]))

    let results: KnowledgeSearchResult[] = chunks.flatMap((chunk) => {
      const item = itemById.get(chunk.itemId)
      if (!item || !chunk.embedding) return []
      return [{
        baseId,
        itemId: item.id,
        itemTitle: item.title,
        chunkId: chunk.id,
        chunkIndex: chunk.index,
        content: chunk.content,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }]
    })

    const topK = configOverride.topK ?? base.config.topK
    results = results.sort((left, right) => right.score - left.score).slice(0, Math.max(topK * 3, topK))

    if (configOverride.rerankEnabled ?? base.config.rerankEnabled) {
      results = await this.rerankResults(base, query, results)
    }

    return rankKnowledgeResults(results, {
      topK,
      threshold: configOverride.threshold ?? base.config.threshold,
    })
  }

  private async rerankResults(
    base: KnowledgeBase,
    query: string,
    results: KnowledgeSearchResult[],
  ) {
    if (!results.length || !base.config.rerankModel) return results
    const provider = await this.resolveModelProvider(
      base.config.rerankProviderId,
      base.config.rerankModel,
      '请先选择可用的重排模型',
    )
    const reranked = await requestRerank(
      provider,
      base.config.rerankModel,
      query,
      results.map((result) => result.content),
      results.length,
    )
    const scoreByIndex = new Map(reranked.map((item) => [item.index, item.score]))
    return results.map((result, index) => ({
      ...result,
      rerankScore: scoreByIndex.get(index),
    }))
  }

  private async resolveModelProvider(
    providerId: string | undefined,
    model: string | undefined,
    errorMessage: string,
  ) {
    const providers = await this.getProviders()
    const provider =
      providers.find((item) => item.id === providerId) ??
      providers.find((item) => item.model === model) ??
      providers.find((item) => item.enabled && item.apiKey && item.model === model)
    if (!provider?.apiKey) throw new Error(errorMessage)
    return provider
  }
}

async function embedTextsInBatches(
  provider: ProviderConfig,
  model: string,
  texts: string[],
) {
  const embeddings: number[][] = []

  for (let start = 0; start < texts.length; start += embeddingBatchSize) {
    embeddings.push(
      ...await requestEmbeddings(
        provider,
        model,
        texts.slice(start, start + embeddingBatchSize),
      ),
    )
  }

  return embeddings
}

async function requireBase(baseId: string) {
  const base = await knowledgeRepository.getBase(baseId)
  if (!base) throw new Error('知识库不存在')
  return base
}

async function expandInputs(baseId: string, inputs: KnowledgeAddItemInput[]) {
  const expanded: KnowledgeAddItemInput[] = []

  for (const input of inputs) {
    if (input.files?.length) {
      for (const file of input.files) {
        expanded.push(await inputFromFile(baseId, file))
      }
      continue
    }
    if (input.file) {
      expanded.push(await inputFromFile(baseId, input.file))
      continue
    }
    if ((input.sourceType === 'url' || input.sourceType === 'website') && input.sourceUri) {
      expanded.push(...await inputFromUrl(input))
      continue
    }
    expanded.push(input)
  }

  return expanded
}

async function inputFromFile(baseId: string, file: File): Promise<KnowledgeAddItemInput> {
  return {
    sourceType: 'file',
    title: file.name,
    mimeType: file.type,
    size: file.size,
    sourceUri: `local://${baseId}/${file.name}`,
    text: await parseKnowledgeFile(file),
  }
}

async function inputFromUrl(input: KnowledgeAddItemInput): Promise<KnowledgeAddItemInput[]> {
  if (!input.sourceUri) return [input]
  if (input.sourceType === 'website') {
    const urls = await fetchSitemapUrls(input.sourceUri)
    return Promise.all(
      urls.map(async (url) => ({
        sourceType: 'website' as const,
        title: url,
        sourceUri: url,
        text: await fetchUrlText(url),
      })),
    )
  }
  return [{
    ...input,
    text: await fetchUrlText(input.sourceUri),
  }]
}
