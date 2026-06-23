import type {
  ChatAttachment,
  ChatAttachmentKind,
  CompletionContentPart,
  ProviderConfig,
} from '@/shared/types'
import { hasModelCapability } from '@/shared/model/providerModelCapabilities'

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024
export const MAX_TEXT_ATTACHMENT_BYTES = 2 * 1024 * 1024

export interface ChatAttachmentCapability {
  supportsImages: boolean
  supportsDocuments: boolean
  supportsTextFiles: boolean
}

export function getAttachmentCapability(
  provider?: ProviderConfig,
): ChatAttachmentCapability {
  const providerModel =
    provider?.models?.find((model) => model.id === provider.model) ??
    provider?.models?.[0]
  const target = providerSignature(provider)
  const isQwen = target.includes('qwen') || target.includes('dashscope')
  const supportsImages =
    hasModelCapability(providerModel, 'vision') ||
    isQwen ||
    target.includes('vision') ||
    target.includes('-vl') ||
    target.includes('vl-') ||
    target.includes('qvq') ||
    target.includes('omni') ||
    target.includes('gpt-4o') ||
    target.includes('gpt-4.1') ||
    target.includes('gemini') ||
    target.includes('claude')

  return {
    supportsImages,
    supportsDocuments: false,
    supportsTextFiles: true,
  }
}

export function getAttachmentKind(file: File): ChatAttachmentKind {
  if (isImageFile(file)) return 'image'
  if (isPlainTextFile(file)) return 'text'
  return 'document'
}

export function isImageFile(file: File) {
  return file.type.startsWith('image/') || SUPPORTED_IMAGE_MIME_TYPES.has(file.type)
}

export function isPlainTextFile(file: File) {
  return (
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    file.type === 'application/xml' ||
    file.name.toLowerCase().endsWith('.txt') ||
    file.name.toLowerCase().endsWith('.md')
  )
}

export function isDocumentFile(file: File) {
  return (
    file.type === 'application/pdf' ||
    WORD_MIME_TYPES.has(file.type) ||
    /\.pdf$/i.test(file.name) ||
    /\.docx?$/i.test(file.name)
  )
}

export function canAttachFile(
  file: File,
  capability: ChatAttachmentCapability,
) {
  if (isImageFile(file)) return capability.supportsImages
  if (isPlainTextFile(file)) return capability.supportsTextFiles
  if (isDocumentFile(file)) return capability.supportsDocuments
  return false
}

export function getFileAttachmentError(
  file: File,
  capability: ChatAttachmentCapability,
) {
  if (isPlainTextFile(file) && file.size > MAX_TEXT_ATTACHMENT_BYTES) {
    return '文本文件太大了，先控制在 2MB 以内'
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return '文件太大了，先控制在 7MB 以内'
  }
  if (canAttachFile(file, capability)) return ''
  if (isImageFile(file)) return '当前模型不支持图片输入'
  if (isDocumentFile(file)) return '当前模型不支持直接读取 PDF 或 Word'
  return '暂不支持这个文件类型'
}

export function getUnsupportedAttachmentReason(
  attachments: ChatAttachment[],
  capability: ChatAttachmentCapability,
) {
  if (attachments.some((item) => item.kind === 'image') && !capability.supportsImages) {
    return '当前模型不支持图片输入'
  }
  if (
    attachments.some((item) => item.kind === 'document') &&
    !capability.supportsDocuments
  ) {
    return '当前模型不支持直接读取 PDF 或 Word'
  }
  return ''
}

export function buildAttachmentContentParts(
  text: string,
  attachments: ChatAttachment[] = [],
): string | CompletionContentPart[] {
  const imageParts = attachments
    .filter((attachment) => attachment.kind === 'image' && attachment.dataUrl)
    .map<CompletionContentPart>((attachment) => ({
      type: 'image_url',
      image_url: { url: attachment.dataUrl as string },
    }))
  const documentParts = attachments
    .filter((attachment) => attachment.kind === 'document' && attachment.dataUrl)
    .map<CompletionContentPart>((attachment) => ({
      type: 'file',
      file: {
        filename: attachment.name,
        file_data: attachment.dataUrl as string,
      },
    }))
  const textAttachmentContent = attachments
    .filter((attachment) => attachment.kind === 'text' && attachment.text)
    .map((attachment) => `\n\n[${attachment.name}]\n${attachment.text}`)
    .join('')
  const combinedText = `${text}${textAttachmentContent}`.trim()

  if (!imageParts.length && !documentParts.length) return combinedText
  return [
    ...imageParts,
    ...documentParts,
    ...(combinedText ? [{ type: 'text' as const, text: combinedText }] : []),
  ]
}

export function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`
  return `${Math.round(size / 1024 / 102.4) / 10} MB`
}

function providerSignature(provider?: ProviderConfig) {
  return `${provider?.name ?? ''} ${provider?.baseUrl ?? ''} ${
    provider?.model ?? ''
  }`.toLowerCase()
}

export function defaultAttachmentName(kind: ChatAttachmentKind) {
  if (kind === 'image') return '粘贴图片'
  if (kind === 'text') return '文本文件'
  return '文件'
}

export function fallbackMimeType(name: string) {
  if (/\.pdf$/i.test(name)) return 'application/pdf'
  if (/\.docx$/i.test(name)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (/\.doc$/i.test(name)) return 'application/msword'
  if (/\.md$/i.test(name)) return 'text/markdown'
  if (/\.txt$/i.test(name)) return 'text/plain'
  return 'application/octet-stream'
}
