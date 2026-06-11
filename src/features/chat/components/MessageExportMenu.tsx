import { Copy, FileDown, FileText, Image, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  copyMessageImage,
  copyMessageText,
  downloadMessageImage,
  downloadMessageMarkdown,
  downloadMessageWord,
} from '@/features/chat/application/messageExportService'
import type { ChatMessage } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface MessageExportMenuProps {
  message: ChatMessage
  onError: (message: string) => void
  onSuccess: (message: string) => void
}

export function MessageExportMenu({
  message,
  onError,
  onSuccess,
}: MessageExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const run = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action()
      onSuccess(successMessage)
      setOpen(false)
    } catch (error) {
      onError(error instanceof Error ? error.message : '导出失败')
    }
  }

  const toggleMenu = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = 244
      setMenuPosition({
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 232),
      })
    }
    setOpen((value) => !value)
  }

  return (
    <div className="message-export-menu">
      <IconButton
        ref={buttonRef}
        icon={<MoreHorizontal />}
        label="导出"
        active={open}
        onClick={toggleMenu}
      />
      {open &&
        createPortal(
          <div
            className="message-export-popover"
            ref={popoverRef}
            style={{
              left: `${menuPosition.left}px`,
              top: `${menuPosition.top}px`,
            }}
          >
          <button
            type="button"
            onClick={() =>
              void run(() => copyMessageText(message, 'plain-text'), '复制成功')
            }
          >
            <Copy />
            <span>复制为纯文本</span>
          </button>
          <button
            type="button"
            onClick={() => void run(() => copyMessageImage(message), '复制成功')}
          >
            <Image />
            <span>复制为图片</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void run(() => downloadMessageImage(message), '导出成功')
            }
          >
            <Image />
            <span>导出为图片</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void run(() => downloadMessageMarkdown(message, false), '导出成功')
            }
          >
            <FileText />
            <span>导出为 Markdown</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void run(() => downloadMessageMarkdown(message, true), '导出成功')
            }
          >
            <FileText />
            <span>导出为 Markdown（包含思考）</span>
          </button>
          <button
            type="button"
            onClick={() => void run(() => downloadMessageWord(message), '导出成功')}
          >
            <FileDown />
            <span>导出为 Word</span>
          </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
