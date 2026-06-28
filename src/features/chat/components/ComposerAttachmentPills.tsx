import { FileText, Image, X } from 'lucide-react'
import { formatAttachmentSize } from '@/features/chat/model/attachments'
import type { ChatAttachment } from '@/shared/types'

interface ComposerAttachmentPillsProps {
  attachments: ChatAttachment[]
  onRemove: (attachmentId: string) => void
}

export function ComposerAttachmentPills({
  attachments,
  onRemove,
}: ComposerAttachmentPillsProps) {
  if (!attachments.length) return null

  return (
    <div className="composer-attachments">
      {attachments.map((attachment) => (
        <span className="attachment-pill" key={attachment.id}>
          {attachment.kind === 'image' ? <Image /> : <FileText />}
          <span>{attachment.name}</span>
          <small>{formatAttachmentSize(attachment.size)}</small>
          <button
            type="button"
            aria-label={`移除 ${attachment.name}`}
            onClick={() => onRemove(attachment.id)}
          >
            <X />
          </button>
        </span>
      ))}
    </div>
  )
}
