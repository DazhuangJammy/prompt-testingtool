import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { IconButton } from '@/shared/ui/IconButton'

interface ImagePreviewDialogProps {
  name: string
  src: string
  onClose: () => void
}

export function ImagePreviewDialog({ name, onClose, src }: ImagePreviewDialogProps) {
  return createPortal(
    <div className="image-preview-backdrop" onMouseDown={onClose}>
      <div
        className="image-preview-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="image-preview-head">
          <span>{name}</span>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>
        <img src={src} alt={name} />
      </div>
    </div>,
    document.body,
  )
}
