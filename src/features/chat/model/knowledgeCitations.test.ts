import { describe, expect, it } from 'vitest'
import type { ChatKnowledgeReference } from '@/shared/types'
import {
  appendMissingKnowledgeCitationMarks,
  createKnowledgeCitations,
  linkKnowledgeCitationMarks,
  summarizeKnowledgeCitation,
} from './knowledgeCitations'

const reference: ChatKnowledgeReference = {
  baseId: 'base',
  baseName: '测试知识库',
  itemId: 'item',
  itemTitle: '访谈总结提炼.docx',
  chunkId: 'chunk',
  chunkIndex: 0,
  content: '系统内有 130 多家客户，但真正活跃、高频率下单的仅 30-40 家。',
  score: 0.9,
}

describe('knowledge citations', () => {
  it('numbers references from the current answer order', () => {
    expect(createKnowledgeCitations([reference])).toEqual([
      { number: 1, reference },
    ])
  })

  it('appends only missing citation marks once', () => {
    const citations = createKnowledgeCitations([
      reference,
      { ...reference, chunkId: 'chunk-2' },
    ])

    expect(appendMissingKnowledgeCitationMarks('答案已有 [1]', citations)).toBe(
      '答案已有 [1] [2]',
    )
    expect(appendMissingKnowledgeCitationMarks('答案已有 [1] [2]', citations)).toBe(
      '答案已有 [1] [2]',
    )
  })

  it('links plain marks without touching markdown links or images', () => {
    const citations = createKnowledgeCitations([reference])

    expect(
      linkKnowledgeCitationMarks(
        '答案 [1] [链接](https://example.com) ![图](image.png)',
        citations,
      ),
    ).toBe(
      '答案 [[1]](#knowledge-citation-1) [链接](https://example.com) ![图](image.png)',
    )
  })

  it('summarizes long reference content', () => {
    expect(summarizeKnowledgeCitation(reference, 12)).toBe('系统内有 130 多家客...')
  })
})
