import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from '@/shared/types'
import {
  buildAttachmentContentParts,
  fallbackMimeType,
  getAttachmentCapability,
  getFileAttachmentError,
  getUnsupportedAttachmentReason,
} from './attachments'

const provider = (model: string, baseUrl = 'https://example.test') =>
  ({ model, baseUrl, name: model } as ProviderConfig)

describe('chat attachments model', () => {
  it('detects image-capable Qwen models', () => {
    expect(getAttachmentCapability(provider('qwen3.7-plus')).supportsImages).toBe(
      true,
    )
    expect(getAttachmentCapability(provider('qwen3.7-max')).supportsImages).toBe(
      false,
    )
    expect(getAttachmentCapability(provider('text-only')).supportsImages).toBe(false)
  })

  it('allows supported documents because they are parsed as text', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    expect(
      getFileAttachmentError(file, getAttachmentCapability(provider('qwen3.7-plus'))),
    ).toBe('')
    expect(getAttachmentCapability(provider('text-only')).supportsDocuments).toBe(true)
  })

  it('validates file types and sizes by capability', () => {
    const textOnly = getAttachmentCapability(provider('text-only'))
    const imageFile = new File(['x'], 'shot.png', { type: 'image/png' })
    const textFile = new File(['x'], 'note.txt', { type: 'text/plain' })
    const largeTextFile = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.txt', {
      type: 'text/plain',
    })
    const largeImageFile = new File(
      [new Uint8Array(7 * 1024 * 1024 + 1)],
      'large.png',
      { type: 'image/png' },
    )

    expect(getFileAttachmentError(imageFile, textOnly)).toBe(
      '当前模型不支持图片输入',
    )
    expect(getFileAttachmentError(textFile, textOnly)).toBe('')
    expect(getFileAttachmentError(largeTextFile, textOnly)).toBe(
      '文本文件太大了，先控制在 2MB 以内',
    )
    expect(
      getFileAttachmentError(
        largeImageFile,
        getAttachmentCapability(provider('qwen3.7-plus')),
      ),
    ).toBe('文件太大了，先控制在 7MB 以内')
  })

  it('reports unsupported queued attachments before sending', () => {
    expect(
      getUnsupportedAttachmentReason(
        [
          {
            id: 'image',
            kind: 'image',
            name: 'shot.png',
            mimeType: 'image/png',
            size: 1,
            dataUrl: 'data:image/png;base64,a',
          },
        ],
        getAttachmentCapability(provider('text-only')),
      ),
    ).toBe('当前模型不支持图片输入')
    expect(
      getUnsupportedAttachmentReason(
        [
          {
            id: 'doc',
            kind: 'document',
            name: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 1,
            text: 'extracted text',
          },
        ],
        getAttachmentCapability(provider('qwen3.7-plus')),
      ),
    ).toBe('')
  })

  it('builds content parts from image and text attachments', () => {
    expect(
      buildAttachmentContentParts('hello', [
        {
          id: 'image',
          kind: 'image',
          name: 'shot.png',
          mimeType: 'image/png',
          size: 1,
          dataUrl: 'data:image/png;base64,a',
        },
        {
          id: 'text',
          kind: 'text',
          name: 'note.txt',
          mimeType: 'text/plain',
          size: 1,
          text: 'note',
        },
      ]),
    ).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,a' } },
      { type: 'text', text: 'hello\n\n[note.txt]\nnote' },
    ])
  })

  it('builds document attachments as text content for every model', () => {
    expect(
      buildAttachmentContentParts('read this', [
        {
          id: 'doc',
          kind: 'document',
          name: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 1,
          text: 'pdf text',
        },
      ]),
    ).toBe('read this\n\n[doc.pdf]\npdf text')
  })

  it('falls back mime types from filenames', () => {
    expect(fallbackMimeType('paper.pdf')).toBe('application/pdf')
    expect(fallbackMimeType('paper.doc')).toBe('application/msword')
    expect(fallbackMimeType('paper.docx')).toContain('wordprocessingml')
    expect(fallbackMimeType('note.md')).toBe('text/markdown')
    expect(fallbackMimeType('note.txt')).toBe('text/plain')
    expect(fallbackMimeType('slides.pptx')).toContain('presentationml')
    expect(fallbackMimeType('table.xlsx')).toContain('spreadsheetml')
    expect(fallbackMimeType('book.epub')).toBe('application/epub+zip')
    expect(fallbackMimeType('archive.bin')).toBe('application/octet-stream')
  })
})
