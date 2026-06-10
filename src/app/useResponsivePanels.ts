import { useState } from 'react'

function isNarrowScreen() {
  return window.matchMedia('(max-width: 920px)').matches
}

export function useResponsivePanels() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isNarrowScreen)
  const [chatCollapsed, setChatCollapsed] = useState(isNarrowScreen)

  return {
    chatCollapsed,
    openChat: () => setChatCollapsed(false),
    sidebarCollapsed,
    toggleChat: () => setChatCollapsed((value) => !value),
    toggleSidebar: () => setSidebarCollapsed((value) => !value),
  }
}
