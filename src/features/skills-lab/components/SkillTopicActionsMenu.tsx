import {
  Bot,
  CopyPlus,
  FolderOpen,
  Link,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Unlink,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SkillTopic } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface SkillTopicActionsMenuProps {
  topic: SkillTopic
  onAnalyze: (topic: SkillTopic) => void
  onCreateSkill: (topic: SkillTopic) => void
  onDuplicate: (topic: SkillTopic) => void
  onOpenFolder: (topic: SkillTopic) => void
  onRename: (topic: SkillTopic) => void
  onSelectSkill: (topic: SkillTopic) => void
  onUnbind: (topic: SkillTopic) => void
}

export function SkillTopicActionsMenu({
  topic,
  onAnalyze,
  onCreateSkill,
  onDuplicate,
  onOpenFolder,
  onRename,
  onSelectSkill,
  onUnbind,
}: SkillTopicActionsMenuProps) {
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
      const menuWidth = 190
      setMenuPosition({
        left: Math.max(
          8,
          Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
        ),
        top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 220)),
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

  const run = (action: (topic: SkillTopic) => void) => {
    action(topic)
    setOpen(false)
  }

  return (
    <div className="topic-actions-wrap">
      <IconButton
        ref={buttonRef}
        className="topic-menu-button"
        icon={<MoreHorizontal />}
        label="Skills 话题操作"
        active={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open &&
        createPortal(
          <div
            className="topic-actions-menu skills-topic-actions-menu"
            ref={menuRef}
            style={menuPosition}
          >
            <button type="button" onClick={() => run(onRename)}>
              <Pencil />
              <span>编辑命名</span>
            </button>
            <button type="button" onClick={() => run(onCreateSkill)}>
              <Bot />
              <span>新建 Skill</span>
            </button>
            <button type="button" onClick={() => run(onSelectSkill)}>
              <Link />
              <span>选择 Skill</span>
            </button>
            <button
              type="button"
              disabled={!topic.skillPath || topic.status === 'analyzing'}
              onClick={() => run(onAnalyze)}
            >
              <RefreshCw />
              <span>重新解读</span>
            </button>
            <button
              type="button"
              disabled={!topic.skillPath}
              onClick={() => run(onOpenFolder)}
            >
              <FolderOpen />
              <span>打开本地文件夹</span>
            </button>
            <button type="button" onClick={() => run(onDuplicate)}>
              <CopyPlus />
              <span>复制副本</span>
            </button>
            <button
              type="button"
              disabled={!topic.skillPath}
              onClick={() => run(onUnbind)}
            >
              <Unlink />
              <span>移除绑定</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
