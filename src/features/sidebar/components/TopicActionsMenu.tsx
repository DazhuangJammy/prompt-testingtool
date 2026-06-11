import {
  ChevronRight,
  Copy,
  FileDown,
  FileText,
  Image,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChatSession } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import type { ChatSessionExportAction } from '../sidebar.types'

interface TopicActionsMenuProps {
  session: ChatSession
  onExport: (session: ChatSession, action: ChatSessionExportAction) => void
  onRename: (session: ChatSession) => void
}

export function TopicActionsMenu({
  session,
  onExport,
  onRename,
}: TopicActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const exportCloseTimerRef = useRef<number | undefined>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnPointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      if (buttonRef.current?.contains(event.target as Node)) return
      setOpen(false)
      setExportOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      setExportOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(
    () => () => {
      if (exportCloseTimerRef.current) {
        window.clearTimeout(exportCloseTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!open) return

    const placeMenu = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 168
      setMenuPosition({
        left: Math.max(
          8,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
        ),
        top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 92)),
      })
    }

    placeMenu()
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open])

  const runExport = (action: ChatSessionExportAction) => {
    onExport(session, action)
    setOpen(false)
    setExportOpen(false)
  }

  const toggleMenu = () => {
    setOpen((value) => {
      const next = !value
      if (!next) setExportOpen(false)
      return next
    })
  }

  const showExportMenu = () => {
    if (exportCloseTimerRef.current) {
      window.clearTimeout(exportCloseTimerRef.current)
      exportCloseTimerRef.current = undefined
    }
    setExportOpen(true)
  }

  const scheduleExportMenuClose = () => {
    if (exportCloseTimerRef.current) {
      window.clearTimeout(exportCloseTimerRef.current)
    }
    exportCloseTimerRef.current = window.setTimeout(() => {
      setExportOpen(false)
      exportCloseTimerRef.current = undefined
    }, 220)
  }

  return (
    <div className="topic-actions-wrap">
      <IconButton
        ref={buttonRef}
        className="topic-menu-button"
        icon={<MoreHorizontal />}
        label="话题操作"
        active={open}
        onClick={toggleMenu}
      />
      {open &&
        createPortal(
          <div
            className="topic-actions-menu"
            ref={menuRef}
            style={menuPosition}
          >
            <button
              type="button"
              onClick={() => {
                onRename(session)
                setOpen(false)
              }}
            >
              <Pencil />
              <span>编辑命名</span>
            </button>
            <div
              className={`topic-export-submenu ${exportOpen ? 'is-open' : ''}`}
              onMouseEnter={showExportMenu}
              onMouseLeave={scheduleExportMenuClose}
              onPointerEnter={showExportMenu}
              onPointerLeave={scheduleExportMenuClose}
            >
              <button
                type="button"
                className="topic-export-trigger"
                onClick={showExportMenu}
              >
                <FileDown />
                <span>导出</span>
                <ChevronRight />
              </button>
              <div
                className="topic-export-menu"
                onMouseEnter={showExportMenu}
                onMouseLeave={scheduleExportMenuClose}
                onPointerEnter={showExportMenu}
                onPointerLeave={scheduleExportMenuClose}
              >
                <button type="button" onClick={() => runExport('copy-text')}>
                  <Copy />
                  <span>复制为纯文本</span>
                </button>
                <button type="button" onClick={() => runExport('copy-image')}>
                  <Image />
                  <span>复制为图片</span>
                </button>
                <button type="button" onClick={() => runExport('download-image')}>
                  <Image />
                  <span>导出为图片</span>
                </button>
                <button
                  type="button"
                  onClick={() => runExport('download-markdown')}
                >
                  <FileText />
                  <span>导出为 Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => runExport('download-markdown-with-thinking')}
                >
                  <FileText />
                  <span>导出为 Markdown（包含思考）</span>
                </button>
                <button type="button" onClick={() => runExport('download-word')}>
                  <FileDown />
                  <span>导出为 Word</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
