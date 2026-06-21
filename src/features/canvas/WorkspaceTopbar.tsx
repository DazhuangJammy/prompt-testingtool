import type { ReactNode } from 'react'

interface WorkspaceTopbarProps {
  title: string
  children?: ReactNode
}

export function WorkspaceTopbar({ children, title }: WorkspaceTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span>{title}</span>
      </div>
      <div className="topbar-actions">{children}</div>
    </header>
  )
}
