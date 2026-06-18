import { useState } from 'react'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getMaxChatWidth = () => Math.max(280, window.innerWidth * 0.75)

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState(248)
  const [chatWidth, setChatWidth] = useState(360)

  const startSidebarResize = (event: React.PointerEvent) => {
    const startX = event.clientX
    const startWidth = sidebarWidth
    const move = (moveEvent: PointerEvent) => {
      setSidebarWidth(
        clamp(startWidth + moveEvent.clientX - startX, 180, window.innerWidth * 0.45),
      )
    }
    bindPointerDrag(move)
  }

  const startChatResize = (event: React.PointerEvent) => {
    const startX = event.clientX
    const startWidth = chatWidth
    const move = (moveEvent: PointerEvent) => {
      setChatWidth(
        clamp(startWidth + startX - moveEvent.clientX, 280, getMaxChatWidth()),
      )
    }
    bindPointerDrag(move)
  }

  const ensureChatWidth = (minWidth: number) => {
    setChatWidth((current) => clamp(Math.max(current, minWidth), 280, getMaxChatWidth()))
  }

  return {
    chatWidth,
    ensureChatWidth,
    sidebarWidth,
    startChatResize,
    startSidebarResize,
  }
}

function bindPointerDrag(move: (event: PointerEvent) => void) {
  document.body.classList.add('is-resizing-panel')

  const stop = () => {
    document.body.classList.remove('is-resizing-panel')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
}
