import JSZip from 'jszip'
import * as mammoth from 'mammoth/mammoth.browser'
import * as XLSX from 'xlsx'
import { extractLegacyWordText } from '@/shared/api/document'
import { fetchKnowledgeRemoteText } from '@/shared/api/knowledge'

export const SUPPORTED_DOCUMENT_TEXT_EXTENSIONS = [
  'txt',
  'md',
  'markdown',
  'html',
  'htm',
  'pdf',
  'doc',
  'docx',
  'pptx',
  'xlsx',
  'xls',
  'csv',
  'epub',
] as const

export type SupportedDocumentTextExtension =
  (typeof SUPPORTED_DOCUMENT_TEXT_EXTENSIONS)[number]

export function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function isSupportedDocumentTextFile(filename: string) {
  return SUPPORTED_DOCUMENT_TEXT_EXTENSIONS.includes(
    getFileExtension(filename) as SupportedDocumentTextExtension,
  )
}

export async function parseDocumentFile(file: File) {
  const extension = getFileExtension(file.name)
  if (extension === 'txt' || extension === 'md' || extension === 'markdown' || extension === 'csv') {
    return file.text()
  }
  if (extension === 'html' || extension === 'htm') {
    return htmlToText(await file.text())
  }
  if (extension === 'pdf') {
    return parsePdf(file)
  }
  if (extension === 'doc') {
    return extractLegacyWordText(file)
  }
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }
  if (extension === 'pptx') {
    return parseOfficeXml(file, /ppt\/slides\/slide\d+\.xml$/)
  }
  if (extension === 'xlsx' || extension === 'xls') {
    return parseSpreadsheet(file)
  }
  if (extension === 'epub') {
    return parseEpub(file)
  }
  throw new Error(`不支持的文件格式：${file.name}`)
}

export async function fetchUrlText(url: string) {
  const { contentType, text } = await fetchKnowledgeRemoteText(url)
  return contentType.includes('html') ? htmlToText(text) : text
}

export async function fetchSitemapUrls(sitemapUrl: string) {
  const { text: xml } = await fetchKnowledgeRemoteText(sitemapUrl)
  const parsedDocument = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(parsedDocument.querySelectorAll('url > loc'))
    .map((node) => node.textContent?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 100)
}

async function parsePdf(file: File) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()
  const pdfDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise
  const pages: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' '),
      )
    }
  } finally {
    pdfDocument.cleanup()
  }

  return pages.join('\n\n')
}

async function parseSpreadsheet(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_csv(sheet)
    return `# ${sheetName}\n${rows}`
  }).join('\n\n')
}

async function parseOfficeXml(file: File, pathPattern: RegExp) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const texts: string[] = []

  const entries = Object.values(zip.files)
    .filter((entry) => pathPattern.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of entries) {
    texts.push(xmlTextToPlain(await entry.async('text')))
  }

  return texts.join('\n\n')
}

async function parseEpub(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const entries = Object.values(zip.files)
    .filter((entry) => /\.(xhtml|html|htm)$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
  const texts: string[] = []

  for (const entry of entries) {
    texts.push(htmlToText(await entry.async('text')))
  }

  return texts.join('\n\n')
}

function htmlToText(html: string) {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html')
  parsedDocument.querySelectorAll('script, style, noscript').forEach((node) => node.remove())
  return parsedDocument.body.textContent ?? parsedDocument.documentElement.textContent ?? ''
}

function xmlTextToPlain(xml: string) {
  const parsedDocument = new DOMParser().parseFromString(xml, 'application/xml')
  return Array.from(parsedDocument.querySelectorAll('t'))
    .map((node) => node.textContent ?? '')
    .join(' ')
}
