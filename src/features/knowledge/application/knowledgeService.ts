import type {
  ChatKnowledgeReference,
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeRagConfig,
  ProviderConfig,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import { LocalKnowledgeProvider } from '../infrastructure/localKnowledgeProvider'
import { knowledgeRepository } from '../infrastructure/knowledgeRepository'
import type { KnowledgeAddItemInput, KnowledgeSearchInput } from '../model/knowledgeProvider'

let localProvider: LocalKnowledgeProvider | undefined

export function getLocalKnowledgeProvider(getProviders: () => Promise<ProviderConfig[]>) {
  localProvider = new LocalKnowledgeProvider(getProviders)
  return localProvider
}

export function createKnowledgeService(getProviders: () => Promise<ProviderConfig[]>) {
  const provider = getLocalKnowledgeProvider(getProviders)

  return {
    listBases: knowledgeRepository.listBases,
    listItems: knowledgeRepository.listItems,
    listChunks: provider.listChunks.bind(provider),
    createBase: provider.createBase.bind(provider),
    updateBase: provider.updateBase.bind(provider),
    deleteBase: provider.deleteBase.bind(provider),
    addItems: provider.addItems.bind(provider),
    deleteItems: provider.deleteItems.bind(provider),
    reindexItems: provider.reindexItems.bind(provider),
    search: provider.search.bind(provider),
  }
}

export async function createKnowledgeBaseWithDefaults(
  input: { name: string; config?: Partial<KnowledgeRagConfig> },
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return getLocalKnowledgeProvider(getProviders).createBase(input)
}

export async function addKnowledgeItems(
  baseId: string,
  items: KnowledgeAddItemInput[],
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return getLocalKnowledgeProvider(getProviders).addItems(baseId, items)
}

export async function searchKnowledge(
  input: KnowledgeSearchInput,
  getProviders: () => Promise<ProviderConfig[]>,
) {
  return getLocalKnowledgeProvider(getProviders).search(input)
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
    ...references.map(
      (reference, index) =>
        `\n[${index + 1}] ${reference.baseName} / ${reference.itemTitle} #${reference.chunkIndex + 1}\n${reference.content}`,
    ),
  ].join('\n')
}
