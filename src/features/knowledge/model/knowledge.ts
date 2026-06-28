import type {
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
  KnowledgeRagConfig,
  KnowledgeSearchResult,
  KnowledgeSourceType,
  ProviderConfig,
  ProviderModelCapability,
} from '@/shared/types'
import { hasModelCapability } from '@/shared/model/providerModelCapabilities'
import {
  isSupportedDocumentTextFile,
  SUPPORTED_DOCUMENT_TEXT_EXTENSIONS,
} from '@/shared/document/documentParser'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

export const DEFAULT_KNOWLEDGE_RAG_CONFIG: KnowledgeRagConfig = {
  chunkSize: 900,
  chunkOverlap: 120,
  topK: 6,
  threshold: 0.18,
  rerankEnabled: false,
}

export const SUPPORTED_KNOWLEDGE_FILE_EXTENSIONS = SUPPORTED_DOCUMENT_TEXT_EXTENSIONS

export const KNOWLEDGE_SOURCE_LABELS: Record<KnowledgeSourceType, string> = {
  file: '文件',
  note: '笔记',
  directory: '目录',
  url: '网址',
  website: '网站',
}

export function createKnowledgeBase(
  input: {
    name: string
    config?: Partial<KnowledgeRagConfig>
  },
): KnowledgeBase {
  const at = nowIso()
  return {
    id: createId(),
    name: input.name.trim() || '未命名知识库',
    providerType: 'local',
    config: normalizeKnowledgeConfig(input.config),
    createdAt: at,
    updatedAt: at,
  }
}

export function createKnowledgeItem(
  input: {
    baseId: string
    sourceType: KnowledgeSourceType
    title: string
    mimeType?: string
    size?: number
    sourceUri?: string
    text?: string
    metadata?: KnowledgeItem['metadata']
  },
): KnowledgeItem {
  const at = nowIso()
  return {
    id: createId(),
    baseId: input.baseId,
    sourceType: input.sourceType,
    title: input.title.trim() || KNOWLEDGE_SOURCE_LABELS[input.sourceType],
    status: 'idle',
    mimeType: input.mimeType,
    size: input.size,
    sourceUri: input.sourceUri,
    text: input.text,
    metadata: input.metadata,
    createdAt: at,
    updatedAt: at,
  }
}

export function normalizeKnowledgeConfig(
  config: Partial<KnowledgeRagConfig> = {},
): KnowledgeRagConfig {
  const chunkSize = clampInteger(config.chunkSize, 200, 4000, 900)
  const chunkOverlap = clampInteger(
    config.chunkOverlap,
    0,
    Math.max(0, chunkSize - 1),
    Math.min(120, chunkSize - 1),
  )

  return {
    ...DEFAULT_KNOWLEDGE_RAG_CONFIG,
    ...config,
    chunkSize,
    chunkOverlap,
    topK: clampInteger(config.topK, 1, 30, DEFAULT_KNOWLEDGE_RAG_CONFIG.topK),
    threshold: clampNumber(config.threshold, 0, 1, DEFAULT_KNOWLEDGE_RAG_CONFIG.threshold),
    rerankEnabled: Boolean(config.rerankEnabled),
  }
}

export function createKnowledgeChunks(
  item: KnowledgeItem,
  content: string,
  config: KnowledgeRagConfig,
): KnowledgeChunk[] {
  const cleaned = cleanKnowledgeText(content)
  if (!cleaned) return []

  const chunks = splitKnowledgeText(cleaned, config.chunkSize, config.chunkOverlap)
  const at = nowIso()
  return chunks.map((chunk, index) => ({
    id: createId(),
    baseId: item.baseId,
    itemId: item.id,
    index,
    content: chunk,
    tokenEstimate: estimateTokenCount(chunk),
    createdAt: at,
  }))
}

export function cleanKnowledgeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ \u00a0]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitKnowledgeText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const clean = cleanKnowledgeText(text)
  if (!clean) return []

  const paragraphs = clean.split(/\n{2,}/)
  const chunks: string[] = []
  let buffer = ''

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue
    if (!buffer) {
      buffer = paragraph
      continue
    }
    if (buffer.length + paragraph.length + 2 <= chunkSize) {
      buffer = `${buffer}\n\n${paragraph}`
      continue
    }
    chunks.push(...splitOversizedChunk(buffer, chunkSize, chunkOverlap))
    buffer = paragraph
  }

  if (buffer) chunks.push(...splitOversizedChunk(buffer, chunkSize, chunkOverlap))
  return chunks
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0
  let dot = 0
  let aMagnitude = 0
  let bMagnitude = 0

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    aMagnitude += a[index] * a[index]
    bMagnitude += b[index] * b[index]
  }

  if (!aMagnitude || !bMagnitude) return 0
  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude))
}

export function rankKnowledgeResults(
  results: KnowledgeSearchResult[],
  config: Pick<KnowledgeRagConfig, 'topK' | 'threshold'>,
) {
  return results
    .filter((result) => Math.max(result.rerankScore ?? result.score, result.score) >= config.threshold)
    .sort((left, right) => (right.rerankScore ?? right.score) - (left.rerankScore ?? left.score))
    .slice(0, config.topK)
}

export function isSupportedKnowledgeFile(filename: string) {
  return isSupportedDocumentTextFile(filename)
}

export function filterKnowledgeModelProviders(
  providers: ProviderConfig[],
  capability: Extract<ProviderModelCapability, 'embedding' | 'rerank'>,
) {
  return providers.filter((provider) =>
    hasModelCapability(
      provider.models?.find((model) => model.id === provider.model) ??
        provider.models?.[0] ??
        { id: provider.model, name: provider.name },
      capability,
    ),
  )
}

export function estimateTokenCount(text: string) {
  const asciiWords = text.match(/[A-Za-z0-9_]+/g)?.length ?? 0
  const cjkChars = text.match(/[\u3400-\u9fff]/g)?.length ?? 0
  return Math.max(1, Math.ceil(asciiWords * 1.3 + cjkChars * 0.8))
}

function splitOversizedChunk(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  const step = Math.max(1, chunkSize - chunkOverlap)
  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize).trim()
    if (chunk) chunks.push(chunk)
    if (start + chunkSize >= text.length) break
  }
  return chunks
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  const numericValue = value ?? Number.NaN
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  const numericValue = value ?? Number.NaN
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(max, Math.max(min, numericValue))
}
