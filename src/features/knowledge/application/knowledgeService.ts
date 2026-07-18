import type {
  ChatKnowledgeReference,
  ChatKnowledgeSelection,
  KnowledgeBase,
  ProviderConfig,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import { LocalKnowledgeProvider } from '../infrastructure/localKnowledgeProvider'
import { BailianKnowledgeProvider } from '../infrastructure/bailianKnowledgeProvider'
import { knowledgeRepository } from '../infrastructure/knowledgeRepository'
import { rankKnowledgeResults } from '../model/knowledge'
import type {
  KnowledgeAddItemInput,
  KnowledgeCreateBaseInput,
  KnowledgeProvider,
  KnowledgeSearchInput,
} from '../model/knowledgeProvider'

let localProvider: LocalKnowledgeProvider | undefined
let bailianProvider: BailianKnowledgeProvider | undefined

export function getLocalKnowledgeProvider(getProviders: () => Promise<ProviderConfig[]>) {
  localProvider = new LocalKnowledgeProvider(getProviders)
  return localProvider
}

export function getBailianKnowledgeProvider() {
  bailianProvider ??= new BailianKnowledgeProvider()
  return bailianProvider
}

export function createKnowledgeService(getProviders: () => Promise<ProviderConfig[]>) {
  const providers: Record<KnowledgeBase['providerType'], KnowledgeProvider> = {
    local: getLocalKnowledgeProvider(getProviders),
    bailian: getBailianKnowledgeProvider(),
  }

  const providerForBase = async (baseId: string) => {
    const base = await knowledgeRepository.getBase(baseId)
    if (!base) throw new Error('知识库不存在')
    return providers[base.providerType]
  }

  return {
    listBases: knowledgeRepository.listBases,
    listItems: knowledgeRepository.listItems,
    async listChunks(baseId: string, itemId: string) {
      return (await providerForBase(baseId)).listChunks(baseId, itemId)
    },
    createBase(input: KnowledgeCreateBaseInput) {
      return providers[input.providerType ?? 'local'].createBase(input)
    },
    async updateBase(baseId: string, updates: Parameters<KnowledgeProvider['updateBase']>[1]) {
      return (await providerForBase(baseId)).updateBase(baseId, updates)
    },
    async deleteBase(baseId: string) {
      return (await providerForBase(baseId)).deleteBase(baseId)
    },
    async addItems(baseId: string, items: KnowledgeAddItemInput[]) {
      return (await providerForBase(baseId)).addItems(baseId, items)
    },
    async deleteItems(baseId: string, itemIds: string[]) {
      return (await providerForBase(baseId)).deleteItems(baseId, itemIds)
    },
    async reindexItems(baseId: string, itemIds?: string[]) {
      return (await providerForBase(baseId)).reindexItems(baseId, itemIds)
    },
    async refreshBase(baseId: string) {
      const provider = await providerForBase(baseId)
      return provider.syncItems?.(baseId) ?? knowledgeRepository.listItems(baseId)
    },
    async search(input: KnowledgeSearchInput) {
      const bases = (await Promise.all(
        input.baseIds.map((baseId) => knowledgeRepository.getBase(baseId)),
      )).filter((base): base is KnowledgeBase => Boolean(base))
      const grouped = new Map<KnowledgeBase['providerType'], string[]>()
      bases.forEach((base) => grouped.set(
        base.providerType,
        [...(grouped.get(base.providerType) ?? []), base.id],
      ))
      const providerResults = await Promise.all(
        [...grouped].map(([providerType, baseIds]) =>
          providers[providerType].search({ ...input, baseIds }),
        ),
      )
      if (providerResults.length <= 1) return providerResults[0] ?? []
      const results = providerResults.flat()
      const firstBase = bases.length === 1 ? bases[0] : undefined
      return rankKnowledgeResults(results, {
        topK: input.config?.topK ?? firstBase?.config.topK ?? 6,
        threshold: input.config?.threshold ?? firstBase?.config.threshold ?? 0.18,
      })
    },
  }
}

export async function createKnowledgeBaseWithDefaults(
  input: KnowledgeCreateBaseInput,
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return createKnowledgeService(getProviders).createBase(input)
}

export async function addKnowledgeItems(
  baseId: string,
  items: KnowledgeAddItemInput[],
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return createKnowledgeService(getProviders).addItems(baseId, items)
}

export async function searchKnowledge(
  input: KnowledgeSearchInput,
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return createKnowledgeService(getProviders).search(input)
}

export async function saveChatKnowledgeSelection(
  sessionId: string,
  baseIds: string[],
) {
  const existing = await knowledgeRepository.getSelection(sessionId)
  if (!baseIds.length) {
    if (existing) await knowledgeRepository.deleteSelection(existing.id)
    return undefined
  }

  const selection: ChatKnowledgeSelection = {
    id: existing?.id ?? createId(),
    sessionId,
    baseIds: Array.from(new Set(baseIds)),
    updatedAt: nowIso(),
  }
  await knowledgeRepository.saveSelection(selection)
  return selection
}

export async function getChatKnowledgeSelection(sessionId?: string) {
  if (!sessionId) return undefined
  return knowledgeRepository.getSelection(sessionId)
}

export async function buildKnowledgeReferences(
  baseIds: string[],
  query: string,
  bases: KnowledgeBase[],
  getProviders: () => Promise<ProviderConfig[]>,
): Promise<ChatKnowledgeReference[]> {
  if (!baseIds.length || !query.trim()) return []
  const results = await searchKnowledge({ baseIds, query }, getProviders)
  const baseById = new Map(bases.map((base) => [base.id, base]))

  return results.map((result) => ({
    baseId: result.baseId,
    baseName: baseById.get(result.baseId)?.name ?? '知识库',
    itemId: result.itemId,
    itemTitle: result.itemTitle,
    chunkId: result.chunkId,
    chunkIndex: result.chunkIndex,
    content: result.content,
    score: result.rerankScore ?? result.score,
  }))
}

export function formatKnowledgeContext(references: ChatKnowledgeReference[]) {
  if (!references.length) return ''
  return [
    '以下是已选知识库召回的参考资料。回答时优先依据这些资料；如果资料不足，请明确说明不足，不要编造。',
    '引用规则：仅引用回答中确实使用的资料；把对应编号写在相关句子或段落末尾，格式为 [1]，同一处可写 [1][2]；不要把引用编号统一堆在回答结尾；未使用的资料不要引用。',
    ...references.map(
      (reference, index) =>
        `\n[${index + 1}] ${reference.baseName} / ${reference.itemTitle} #${reference.chunkIndex + 1}\n${reference.content}`,
    ),
  ].join('\n')
}
