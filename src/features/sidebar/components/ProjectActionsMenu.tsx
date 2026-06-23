import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Canvas } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface ProjectActionsMenuProps {
  canvas: Canvas
  onDelete: (canvas: Canvas) => void
  onRename: (canvas: Canvas) => void
}

export function ProjectActionsMenu({
  canvas,
  onDelete,
  onRename,
}: ProjectActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnPointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      if (buttonRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const placeMenu = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 168
      const menuHeight = 86
      setMenuPosition({
        left: Math.max(
          8,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
        ),
        top: Math.max(
          8,
          Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8),
        ),
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

  return (
    <div className="project-menu-wrap">
      <IconButton
        ref={buttonRef}
        icon={<MoreHorizontal />}
        label="工作台操作"
        active={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open &&
        createPortal(
          <div className="project-menu" ref={menuRef} style={menuPosition}>
            <button
              type="button"
              onClick={() => {
                onRename(canvas)
                setOpen(false)
              }}
            >
              <Pencil />
              <span>重命名工作台</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(canvas)
                setOpen(false)
              }}
            >
              <Trash2 />
              <span>删除工作台</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
