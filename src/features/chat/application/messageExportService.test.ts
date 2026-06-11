import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@/shared/types'
import {
  copyChatSessionImage,
  copyChatSessionText,
  copyMessageImage,
  copyMessageText,
  downloadChatSessionImage,
  downloadChatSessionMarkdown,
  downloadChatSessionWord,
  downloadMessageImage,
  downloadMessageMarkdown,
  downloadMessageWord,
} from './messageExportService'

const message: ChatMessage = {
  id: 'assistant-1',
  sessionId: 'session-1',
  role: 'assistant',
  content: '<think>hidden</think># 标题\n\n回答',
  createdAt: '2026-06-10T10:01:00.000Z',
}

const session = {
  id: 'session-1',
  title: '计划讨论',
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
}

const clickMock = vi.fn()
const appendMock = vi.fn()
const removeMock = vi.fn()
const writeTextMock = vi.fn()
const writeMock = vi.fn()
const blobParts: unknown[][] = []
const drawImageMock = vi.fn()
const toDataUrlMock = vi.fn(() => 'data:image/png;base64,rendered')

describe('message export service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clickMock.mockClear()
    appendMock.mockClear()
    removeMock.mockClear()
    writeTextMock.mockClear()
    writeMock.mockClear()
    drawImageMock.mockClear()
    toDataUrlMock.mockClear()
    blobParts.length = 0
    const OriginalBlob = Blob
    vi.stubGlobal(
      'Blob',
      class extends OriginalBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options)
          blobParts.push([...(parts ?? [])])
        }
      },
    )
    const originalCreateElement = document.createElement.bind(document)
    vi.stubGlobal(
      'ClipboardItem',
      class {
        items: Record<string, Blob>

        constructor(items: Record<string, Blob>) {
          this.items = items
        }
      },
    )
    vi.stubGlobal('Image', createImageStub())
    vi.stubGlobal('navigator', {
      clipboard: {
        write: writeMock,
        writeText: writeTextMock,
      },
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document.body, 'append').mockImplementation(appendMock)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return createCanvasStub() as never
      if (tagName === 'a') {
        const anchor = document.createElementNS(
          'http://www.w3.org/1999/xhtml',
          'a',
        )
        anchor.click = clickMock
        anchor.remove = removeMock
        return anchor
      }
      return originalCreateElement(tagName)
    })
  })

  it('copies plain text without thinking content', async () => {
    await copyMessageText(message, 'plain-text')

    expect(writeTextMock).toHaveBeenCalledWith('标题\n\n回答')
  })

  it('downloads markdown and word files', async () => {
    const svgMessage = {
      ...message,
      content: `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>`,
    }
    await downloadMessageMarkdown(message, true)
    await downloadMessageWord(svgMessage)

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
    expect(clickMock).toHaveBeenCalledTimes(2)
    expect(removeMock).toHaveBeenCalledTimes(2)
    expect(blobParts.flat().join('')).toContain('data:image/png;base64,rendered')
  })

  it('downloads and copies generated message images', async () => {
    await downloadMessageImage(message)
    await copyMessageImage(message)

    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(writeMock).toHaveBeenCalledWith([
      expect.objectContaining({ items: { 'image/png': expect.any(Blob) } }),
    ])
  })

  it('copies and downloads whole chat sessions', async () => {
    await copyChatSessionText(session, [
      {
        id: 'user-1',
        sessionId: 'session-1',
        role: 'user',
        content: '帮我做计划',
        createdAt: '2026-06-10T10:00:01.000Z',
      },
      message,
    ])
    await downloadChatSessionMarkdown(session, [message], true)
    const imageMessages: ChatMessage[] = [
      {
        id: 'user-1',
        sessionId: 'session-1',
        role: 'user',
        content: '这是图片',
        attachments: [
          {
            id: 'image',
            kind: 'image',
            name: 'shot.png',
            mimeType: 'image/png',
            size: 1,
            dataUrl: 'data:image/png;base64,a',
          },
        ],
        createdAt: '2026-06-10T10:00:01.000Z',
      },
      {
        ...message,
        content: `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>`,
      },
    ]
    await downloadChatSessionImage(session, imageMessages)
    await copyChatSessionImage(session, imageMessages)
    await downloadChatSessionWord(session, imageMessages)
    const wordHtml = blobParts.flat().join('')

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('帮我做计划'),
    )
    expect(clickMock).toHaveBeenCalledTimes(3)
    expect(writeMock).toHaveBeenCalledWith([
      expect.objectContaining({ items: { 'image/png': expect.any(Blob) } }),
    ])
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(wordHtml).toContain('这是图片')
    expect(wordHtml).toContain('AI')
    expect(wordHtml).toContain('data:image/png;base64,rendered')
    expect(wordHtml).not.toContain('data:image/svg+xml')
  }, 8000)

  it('exports empty sessions and file attachments as images', async () => {
    await downloadChatSessionImage(session, [])
    await downloadChatSessionImage(session, [
      {
        id: 'system-1',
        sessionId: 'session-1',
        role: 'system',
        content: '',
        attachments: [
          {
            id: 'doc',
            kind: 'document',
            name: 'outline.pdf',
            mimeType: 'application/pdf',
            size: 2048,
          },
        ],
        createdAt: '2026-06-10T10:00:02.000Z',
      },
    ])

    expect(clickMock).toHaveBeenCalledTimes(2)
  })

  it('keeps image exports working when inline images fail to load', async () => {
    vi.stubGlobal('Image', createImageStub('error'))

    await downloadChatSessionImage(session, [
      {
        ...message,
        content: `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>`,
      },
    ])

    expect(clickMock).toHaveBeenCalledTimes(1)
  })

  it('preserves tall rendered image aspect ratio when exporting', async () => {
    vi.stubGlobal('Image', createImageStub('load', { height: 1406, width: 700 }))

    await downloadChatSessionImage(session, [
      {
        ...message,
        content: `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1406"><rect width="700" height="1406"/></svg>`,
      },
    ])

    expect(drawImageMock).toHaveBeenCalledWith(expect.any(Object), 46, 144, 358, 720)
  })

  it('reports unsupported image copy and canvas rendering failures', async () => {
    vi.stubGlobal('ClipboardItem', undefined)

    await expect(copyMessageImage(message)).rejects.toThrow('当前浏览器不支持复制图片')

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => null,
        } as never
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    await expect(downloadMessageImage(message)).rejects.toThrow('无法创建图片')
  })

  it('uses fallback text and reports blob generation failures', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return createCanvasStub(null) as never
      if (tagName === 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    await expect(
      downloadMessageImage({ ...message, content: '' }),
    ).rejects.toThrow('图片生成失败')
  })

  it('reports chat session blob generation failures', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return createCanvasStub(null) as never
      if (tagName === 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    await expect(downloadChatSessionImage(session, [message])).rejects.toThrow(
      '图片生成失败',
    )
  })

  it('reports thrown canvas export failures', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return createCanvasStub(new Blob(['png']), true) as never
      if (tagName === 'a') {
        return document.createElementNS('http://www.w3.org/1999/xhtml', 'a')
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })

    await expect(downloadChatSessionImage(session, [message])).rejects.toThrow(
      '图片生成失败',
    )
  })
})

function createCanvasStub(
  blob: Blob | null = new Blob(['png'], { type: 'image/png' }),
  shouldThrow = false,
) {
  return {
    getContext: () => ({
      beginPath: vi.fn(),
      drawImage: drawImageMock,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      font: '',
      measureText: (text: string) => ({ width: text.length * 10 }),
      moveTo: vi.fn(),
      scale: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
    }),
    style: {},
    toBlob: (callback: (blob: Blob | null) => void) => {
      if (shouldThrow) throw new Error('tainted')
      callback(blob)
    },
    toDataURL: toDataUrlMock,
  }
}

function createImageStub(
  mode: 'load' | 'error' = 'load',
  size: { height: number; width: number } = { height: 180, width: 360 },
) {
  return class {
    complete = false
    naturalHeight = size.height
    naturalWidth = size.width
    onerror: (() => void) | null = null
    onload: (() => void) | null = null

    set src(_value: string) {
      this.complete = true
      queueMicrotask(() => {
        if (mode === 'error') this.onerror?.()
        else this.onload?.()
      })
    }
  }
}
