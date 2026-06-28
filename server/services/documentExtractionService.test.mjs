import { describe, expect, it } from 'vitest'
import { extractDocumentText } from './documentExtractionService.mjs'

describe('documentExtractionService', () => {
  it('rejects unsupported extensions before loading parsers', async () => {
    await expect(
      extractDocumentText({
        filename: 'archive.zip',
        dataBase64: Buffer.from('x').toString('base64'),
      }),
    ).rejects.toThrow('只接收 .doc')
  })

  it('rejects empty document payloads', async () => {
    await expect(
      extractDocumentText({
        filename: 'paper.doc',
        dataBase64: '',
      }),
    ).rejects.toThrow('文档内容为空')
  })
})
