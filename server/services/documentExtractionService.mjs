import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'

const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024
const SUPPORTED_LEGACY_WORD_EXTENSIONS = new Set(['.doc'])

export async function extractDocumentText({ filename, dataBase64 }) {
  const safeName = basename(String(filename ?? 'document.doc'))
  const extension = extname(safeName).toLowerCase()

  if (!SUPPORTED_LEGACY_WORD_EXTENSIONS.has(extension)) {
    throw new Error('当前本地解析器只接收 .doc 文档')
  }

  if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
    throw new Error('文档内容为空')
  }

  const buffer = Buffer.from(dataBase64, 'base64')
  if (!buffer.length) throw new Error('文档内容为空')
  if (buffer.length > MAX_DOCUMENT_BYTES) {
    throw new Error('文件太大了，先控制在 7MB 以内')
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'prompt-tool-doc-'))
  const tempFile = join(tempDir, safeName)

  try {
    await writeFile(tempFile, buffer)
    const { default: WordExtractor } = await import('word-extractor')
    const extractor = new WordExtractor()
    const document = await extractor.extract(tempFile)
    const text = document.getBody().trim()
    if (!text) throw new Error('没有提取到可读文本')
    return text
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
