import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@/shared/types'
import { MessageList } from './MessageList'

let root: Root | undefined
let host: HTMLDivElement | undefined
const writeTextMock = vi.fn()

const imageMessage: ChatMessage = {
  id: 'message-1',
  sessionId: 'session-1',
  role: 'user',
  content: '',
  attachments: [
    {
      id: 'image-1',
      name: 'chart.png',
      mimeType: 'image/png',
      size: 128,
      kind: 'image',
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lAzXWAAAAABJRU5ErkJggg==',
    },
  ],
  createdAt: '2026-06-10T10:00:00.000Z',
}

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="red"/>
</svg>`

const svgMessage: ChatMessage = {
  id: 'message-2',
  sessionId: 'session-1',
  role: 'assistant',
  content: `结果如下：\n\n\`\`\`svg\n${svgContent}\n\`\`\``,
  status: 'complete',
  createdAt: '2026-06-10T10:01:00.000Z',
}

const streamingSvgMessage: ChatMessage = {
  id: 'message-3',
  sessionId: 'session-1',
  role: 'assistant',
  content: `\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="red">`,
  status: 'streaming',
  createdAt: '2026-06-10T10:02:00.000Z',
}

const assistantMessage: ChatMessage = {
  id: 'message-4',
  sessionId: 'session-1',
  role: 'assistant',
  content: '可以导出',
  status: 'complete',
  createdAt: '2026-06-10T10:03:00.000Z',
}

const thinkingMessage: ChatMessage = {
  id: 'message-thinking',
  sessionId: 'session-1',
  role: 'assistant',
  content: '<think>先拆问题，再回答。</think>这是最终回答。',
  thinkingMode: 'on',
  thinkingDurationMs: 2400,
  status: 'complete',
  createdAt: '2026-06-10T10:04:30.000Z',
}

const knowledgeMessage: ChatMessage = {
  id: 'message-knowledge',
  sessionId: 'session-1',
  role: 'assistant',
  content: '根据参考材料，活跃客户集中在少数高频客户中。',
  knowledgeReferences: [
    {
      baseId: 'base',
      baseName: '测试知识库',
      itemId: 'item-1',
      itemTitle: '访谈总结提炼.docx',
      chunkId: 'chunk-1',
      chunkIndex: 0,
      content: '系统内有 130 多家客户，但真正活跃、高频率下单的仅 30-40 家。',
      score: 0.92,
    },
    {
      baseId: 'base',
      baseName: '测试知识库',
      itemId: 'item-2',
      itemTitle: '销售复盘.md',
      chunkId: 'chunk-2',
      chunkIndex: 1,
      content: '销售端需要把客户按成交频次、客单价和流失风险进行分层。',
      score: 0.88,
    },
  ],
  status: 'complete',
  createdAt: '2026-06-10T10:05:00.000Z',
}

const webSearchMessage: ChatMessage = {
  id: 'message-web-search',
  sessionId: 'session-1',
  role: 'assistant',
  content: 'OpenAI 发布了新工具 [1]。',
  webSearchReferences: [
    {
      title: 'OpenAI 发布说明',
      url: 'https://example.com/openai-release',
      content: 'OpenAI 发布了一项新的工具能力。',
      sourceInput: 'OpenAI 新工具',
      providerId: 'bing',
      providerName: 'Bing',
    },
    {
      title: '开发者文档',
      url: 'https://example.com/docs',
      content: '文档说明了工具的使用入口。',
      sourceInput: 'OpenAI 新工具',
      providerId: 'bing',
      providerName: 'Bing',
    },
  ],
  status: 'complete',
  createdAt: '2026-06-10T10:07:00.000Z',
}

const userKnowledgeMessage: ChatMessage = {
  ...knowledgeMessage,
  id: 'message-user-knowledge',
  role: 'user',
  content: '第三次转型是什么时候发生了啥',
  createdAt: '2026-06-10T10:06:00.000Z',
}

const tableMessage: ChatMessage = {
  id: 'message-5',
  sessionId: 'session-1',
  role: 'assistant',
  content: [
    '| 角度编号 | 切入方向 |',
    '| --- | --- |',
    '| 1 | 社交破冰 |',
  ].join('\n'),
  status: 'complete',
  createdAt: '2026-06-10T10:04:00.000Z',
}

const dashItemMessage: ChatMessage = {
  id: 'message-dash-item',
  sessionId: 'session-1',
  role: 'assistant',
  content:
    '— 本次基于输入材料,识别出7个内部能力评估模块。\n— 模块划分逻辑:必须单独拆解为独立评估页面。',
  status: 'complete',
  createdAt: '2026-06-10T10:08:30.000Z',
}

function renderMessageList(messages: ChatMessage[]) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <MessageList messages={messages} onEdit={vi.fn()} onResend={vi.fn()} />,
    )
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('MessageList', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock,
      },
    })
  })

  it('renders image-only user messages as clickable thumbnails', () => {
    renderMessageList([imageMessage])

    const thumbnail = document.querySelector<HTMLButtonElement>(
      '.message-image-thumb',
    )
    const image = thumbnail?.querySelector('img')

    expect(thumbnail).toBeTruthy()
    expect(image?.getAttribute('src')).toBe(imageMessage.attachments?.[0].dataUrl)
    expect(image?.getAttribute('alt')).toBe('chart.png')

    act(() => {
      thumbnail?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const preview = document.body.querySelector('.image-preview-dialog')
    expect(preview?.querySelector('img')?.getAttribute('src')).toBe(
      imageMessage.attachments?.[0].dataUrl,
    )
  })

  it('renders SVG code blocks as preview images with download actions', () => {
    const createObjectUrl = vi.fn(() => 'blob:svg')
    const revokeObjectUrl = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })
    renderMessageList([svgMessage])

    const svgCard = document.querySelector('.message-svg-card')
    const image = svgCard?.querySelector('img')
    const downloadButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="下载 SVG"]',
    )

    expect(svgCard).toBeTruthy()
    expect(image?.getAttribute('src')).toContain('data:image/svg+xml')
    expect(image?.getAttribute('alt')).toBe('svg-preview-1.svg')
    expect(document.body.textContent).not.toContain('<rect width="120"')
    expect(downloadButton).toBeTruthy()
    expect(downloadButton?.disabled).toBe(false)

    act(() => {
      svgCard
        ?.querySelector<HTMLButtonElement>('.message-svg-thumb')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.image-preview-dialog img')).toBeTruthy()
  })

  it('renders unfinished streaming SVG as a live preview with download disabled', () => {
    renderMessageList([streamingSvgMessage])

    const svgCard = document.querySelector('.message-svg-card')
    const image = svgCard?.querySelector('img')
    const downloadButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="下载 SVG"]',
    )

    expect(svgCard).toBeTruthy()
    expect(image?.getAttribute('src')).toContain('data:image/svg+xml')
    expect(downloadButton?.disabled).toBe(true)
    expect(document.body.textContent).toContain('生成中')
  })

  it('shows export actions only for assistant messages', () => {
    renderMessageList([imageMessage, assistantMessage])

    const exportButtons = document.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="导出"]',
    )

    expect(exportButtons).toHaveLength(1)

    act(() => {
      exportButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const popover = document.body.querySelector<HTMLElement>(
      '.message-export-popover',
    )

    expect(popover).toBeTruthy()
    expect(popover?.parentElement).toBe(document.body)
    expect(document.body.textContent).toContain('复制为纯文本')
    expect(document.body.textContent).toContain('导出为 Markdown（包含思考）')
    expect(document.body.textContent).toContain('导出为 Word')
  })

  it('shows success feedback after copying a message', async () => {
    writeTextMock.mockResolvedValue(undefined)
    renderMessageList([assistantMessage])

    const copyButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="复制"]',
    )

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(writeTextMock).toHaveBeenCalledWith('可以导出')
    expect(document.body.textContent).toContain('复制成功')
  })

  it('renders GitHub-flavored Markdown tables in assistant messages', () => {
    renderMessageList([tableMessage])

    const table = document.querySelector('table')

    expect(table).toBeTruthy()
    expect(table?.querySelectorAll('th')).toHaveLength(2)
    expect(table?.textContent).toContain('角度编号')
    expect(table?.textContent).toContain('社交破冰')
  })

  it('renders sentence-level dash items as spaced paragraphs', () => {
    renderMessageList([dashItemMessage])

    const paragraphs = document.querySelectorAll('.message-bubble p')

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].textContent).toContain('— 本次基于输入材料')
    expect(paragraphs[1].textContent).toContain('— 模块划分逻辑')
  })

  it('keeps thinking content collapsed until opened', () => {
    renderMessageList([thinkingMessage])

    const thinkingButton = document.querySelector<HTMLButtonElement>(
      '.thinking-head',
    )

    expect(thinkingButton).toBeTruthy()
    expect(thinkingButton?.textContent).toContain('Thinking')
    expect(document.body.textContent).toContain('这是最终回答。')
    expect(document.body.textContent).not.toContain('先拆问题，再回答。')

    act(() => {
      thinkingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('先拆问题，再回答。')
  })

  it('renders knowledge citation summary, dialog and inline markers', () => {
    renderMessageList([knowledgeMessage])

    const summary = document.querySelector<HTMLButtonElement>(
      '.knowledge-citation-summary',
    )
    expect(summary?.textContent).toContain('2 个引用内容')
    expect(document.querySelectorAll('.knowledge-citation-marker')).toHaveLength(2)
    expect(document.body.textContent).toContain('根据参考材料')

    act(() => {
      summary?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialog = document.querySelector('.knowledge-citation-dialog')
    expect(dialog).toBeTruthy()
    expect(dialog?.textContent).toContain('引用内容')
    expect(dialog?.textContent).toContain('访谈总结提炼.docx')
    expect(dialog?.textContent).toContain('系统内有 130 多家客户')
  })

  it('renders web search result summary and clickable inline citations', () => {
    renderMessageList([webSearchMessage])

    const summary = document.querySelector<HTMLButtonElement>(
      '.web-search-results-head',
    )
    expect(summary?.textContent).toContain('2 个搜索结果')
    expect(summary?.textContent).toContain('Bing')

    const markers = document.querySelectorAll<HTMLAnchorElement>(
      '.web-search-citation-marker',
    )
    expect(markers).toHaveLength(2)
    expect(markers[0].getAttribute('href')).toBe(
      'https://example.com/openai-release',
    )
    expect(markers[0].getAttribute('target')).toBe('_blank')
    expect(markers[1].getAttribute('href')).toBe('https://example.com/docs')

    act(() => {
      summary?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const resultLinks = document.querySelectorAll<HTMLAnchorElement>(
      '.web-search-results-list a',
    )
    expect(resultLinks).toHaveLength(2)
    expect(resultLinks[0].textContent).toContain('OpenAI 发布说明')
    expect(resultLinks[0].getAttribute('href')).toBe(
      'https://example.com/openai-release',
    )
  })

  it('renders web search progress before answer text arrives', () => {
    renderMessageList([
      {
        id: 'message-web-search-progress',
        sessionId: 'session-1',
        role: 'assistant',
        content: '',
        webSearchStatus: {
          phase: 'searching',
          query: 'AI 新闻',
          providerName: 'Baidu',
        },
        status: 'streaming',
        createdAt: '2026-06-10T10:08:00.000Z',
      },
    ])

    const summary = document.querySelector<HTMLButtonElement>(
      '.web-search-results-head',
    )
    expect(summary?.textContent).toContain('正在搜索：AI 新闻')
    expect(summary?.textContent).toContain('Baidu')
  })

  it('hides knowledge citation chrome on user messages', () => {
    renderMessageList([userKnowledgeMessage])

    expect(document.body.textContent).toContain('第三次转型是什么时候发生了啥')
    expect(document.body.textContent).not.toContain('2 个引用内容')
    expect(document.querySelector('.knowledge-citation-summary')).toBeNull()
    expect(document.querySelector('.knowledge-citation-marker')).toBeNull()
  })

  it('keeps normal messages free of knowledge citation chrome', () => {
    renderMessageList([assistantMessage])

    expect(document.querySelector('.knowledge-citation-summary')).toBeNull()
    expect(document.querySelector('.knowledge-citation-marker')).toBeNull()
  })
})
