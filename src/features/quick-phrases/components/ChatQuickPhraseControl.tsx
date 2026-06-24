import { Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, RefObject } from 'react'
import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { insertQuickPhraseAtCaret } from '../model/quickPhraseInsert'
import { QuickPhrasePickerMenu } from './QuickPhrasePickerMenu'

const MENU_WIDTH = 340
const MENU_GAP = 8
const VIEWPORT_MARGIN = 18

interface ChatQuickPhraseControlProps {
  busy: boolean
  disabled: boolean
  generating: boolean
  input: string
  menuOpen: boolean
  groups: QuickPhraseGroup[]
  phrases: QuickPhrase[]
  shellRef: RefObject<HTMLDivElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onCloseMenu: () => void
  onDirectSend?: (content: string) => void
  onToggleMenu: () => void
}

export function ChatQuickPhraseControl({
  busy,
  disabled,
  generating,
  groups,
  input,
  menuOpen,
  onChange,
  onCloseMenu,
  onDirectSend,
  onToggleMenu,
  phrases,
  shellRef,
  textareaRef,
}: ChatQuickPhraseControlProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()

  useEffect(() => {
    if (!menuOpen) return undefined

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const menuWidth = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - menuWidth),
        window.innerWidth - VIEWPORT_MARGIN - menuWidth,
      )
      const maxBottomTop = window.innerHeight - VIEWPORT_MARGIN
      const top = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.top - MENU_GAP, maxBottomTop),
      )

      setMenuStyle({
        left,
        top,
        transform: 'translateY(-100%)',
        width: menuWidth,
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [menuOpen])

  const insertPhrase = (phrase: QuickPhrase) => {
    const textarea = textareaRef.current
    const result = insertQuickPhraseAtCaret(
      input,
      phrase.content,
      textarea?.selectionStart,
      textarea?.selectionEnd,
    )
    onChange(result.value)
    onCloseMenu()
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(result.caretOffset, result.caretOffset)
    })
  }

  const sendPhrase = (phrase: QuickPhrase) => {
    if (disabled || busy || generating) return
    onCloseMenu()
    onDirectSend?.(phrase.content)
  }

  return (
    <div className="composer-menu-shell" ref={shellRef}>
      <IconButton
        ref={buttonRef}
        active={menuOpen}
        icon={<Zap />}
        label="快捷短语"
        onClick={onToggleMenu}
      />
      {menuOpen && menuStyle && createPortal(
        <QuickPhrasePickerMenu
          groups={groups}
          phrases={phrases}
          style={menuStyle}
          onPointerDown={(event) => event.stopPropagation()}
          onInsert={insertPhrase}
          onSend={sendPhrase}
        />,
        document.body,
      )}
    </div>
  )
}
