interface WorkspaceTopbarProps {
  title: string
}

export function WorkspaceTopbar({ title }: WorkspaceTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span>{title}</span>
      </div>
      <div className="topbar-actions" />
    </header>
  )
}
