import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChatAttachment } from './fileAttachmentReader'
import { parseDocumentFile } from '@/shared/document/documentParser'

vi.mock('@/shared/document/documentParser', () => ({
  parseDocumentFile: vi.fn(async (file: File) => `parsed ${file.name}`),
}))

describe('file attachment reader', () => {
  const originalFileReader = globalThis.FileReader

  afterEach(() => {
    globalThis.FileReader = originalFileReader
    vi.restoreAllMocks()
  })

  it('creates text attachments from text files', async () => {
    const attachment = await createChatAttachment(
      new File(['hello'], 'note.txt', { type: 'text/plain' }),
    )

    expect(attachment).toMatchObject({
      kind: 'text',
      mimeType: 'text/plain',
      name: 'note.txt',
      text: 'hello',
    })
  })

  it('creates document attachments from parsed text', async () => {
    const attachment = await createChatAttachment(
      new File(['pdf'], 'brief.pdf', { type: 'application/pdf' }),
    )

    expect(attachment).toMatchObject({
      kind: 'document',
      mimeType: 'application/pdf',
      name: 'brief.pdf',
      text: 'parsed brief.pdf',
    })
    expect(attachment.dataUrl).toBeUndefined()
  })

  it('rejects document attachments without readable text', async () => {
    vi.mocked(parseDocumentFile).mockResolvedValueOnce('   ')

    await expect(
      createChatAttachment(new File(['pdf'], 'scan.pdf', { type: 'application/pdf' })),
    ).rejects.toThrow('没有提取到可读文本')
  })

  it('reads binary attachments as data urls', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000000',
    )
    globalThis.FileReader = class {
      error: Error | null = null
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      result: string | null = null

      readAsDataURL() {
        this.result = 'data:image/png;base64,a'
        this.onload?.()
      }
    } as unknown as typeof FileReader

    await expect(
      createChatAttachment(new File(['x'], 'shot.png', { type: 'image/png' })),
    ).resolves.toMatchObject({
      dataUrl: 'data:image/png;base64,a',
      id: '00000000-0000-4000-8000-000000000000',
      kind: 'image',
      name: 'shot.png',
    })
  })

  it('rejects failed binary reads', async () => {
    globalThis.FileReader = class {
      error = new Error('bad read')
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      result: string | null = null

      readAsDataURL() {
        this.onerror?.()
      }
    } as unknown as typeof FileReader

    await expect(
      createChatAttachment(new File(['x'], 'shot.png', { type: 'image/png' })),
    ).rejects.toThrow('bad read')
  })
})
