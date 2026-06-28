import { describe, expect, it } from 'vitest'
import { formatChatDisplayMarkdown } from './messageDisplay'

describe('message display model', () => {
  it('breaks sentence-level em dash items into readable paragraphs', () => {
    expect(
      formatChatDisplayMarkdown(
        '— 本次基于输入材料,识别出7个内部能力评估模块。 — 模块划分逻辑:必须单独拆解为独立评估页面。',
      ),
    ).toBe(
      '— 本次基于输入材料,识别出7个内部能力评估模块。\n\n— 模块划分逻辑:必须单独拆解为独立评估页面。',
    )
  })

  it('promotes existing soft breaks before dash items to paragraph breaks', () => {
    expect(
      formatChatDisplayMarkdown(
        '利润率约15%,待后续审计确认。\n— 增长目标:计划在2029年实现总营收7亿元。\n— 重点资金积压:生产在线产品流转极慢。',
      ),
    ).toBe(
      '利润率约15%,待后续审计确认。\n\n— 增长目标:计划在2029年实现总营收7亿元。\n\n— 重点资金积压:生产在线产品流转极慢。',
    )
  })

  it('keeps inline explanatory dashes inside a sentence', () => {
    expect(
      formatChatDisplayMarkdown(
        '价值链分析:系统拆解研发、生产、品质、供应链、销售、服务各环节能力强弱 — 资源基础观 RBV:识别高层数软硬结合板技术。',
      ),
    ).toBe(
      '价值链分析:系统拆解研发、生产、品质、供应链、销售、服务各环节能力强弱 — 资源基础观 RBV:识别高层数软硬结合板技术。',
    )
  })

  it('does not rewrite fenced code blocks', () => {
    expect(
      formatChatDisplayMarkdown('正文。 — 下一条\n```md\n句子。 — 保持原样\n```'),
    ).toBe('正文。\n\n— 下一条\n```md\n句子。 — 保持原样\n```')
  })

  it('keeps text around fenced code blocks without duplication', () => {
    expect(formatChatDisplayMarkdown('前文。 — 下一条\n```ts\nconst a = 1\n```\n后文。 — 末条')).toBe(
      '前文。\n\n— 下一条\n```ts\nconst a = 1\n```\n后文。\n\n— 末条',
    )
  })

  it('does not rewrite markdown table rows', () => {
    expect(formatChatDisplayMarkdown('| 说明 | 句子。 — 保持表格 |')).toBe(
      '| 说明 | 句子。 — 保持表格 |',
    )
  })
})
