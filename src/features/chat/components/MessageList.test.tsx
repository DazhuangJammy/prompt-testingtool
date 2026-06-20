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
})
