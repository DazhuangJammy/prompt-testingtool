import {
  defaultAttachmentName,
  fallbackMimeType,
  getAttachmentKind,
} from '@/features/chat/model/attachments'
import type { ChatAttachment } from '@/shared/types'

export async function createChatAttachment(file: File): Promise<ChatAttachment> {
  const kind = getAttachmentKind(file)
  const base = {
    id: crypto.randomUUID(),
    name: file.name || defaultAttachmentName(kind),
    mimeType: file.type || fallbackMimeType(file.name),
    size: file.size,
    kind,
  }

  if (kind === 'text') {
    return { ...base, text: await file.text() }
  }

  return { ...base, dataUrl: await readFileAsDataUrl(file) }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}
