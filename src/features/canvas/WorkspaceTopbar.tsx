import { Moon, Settings, Sun } from 'lucide-react'
import type { ThemeMode } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface WorkspaceTopbarProps {
  title: string
  theme: ThemeMode
  onOpenSettings: () => void
  onToggleTheme: () => void
}

export function WorkspaceTopbar({
  title,
  theme,
  onOpenSettings,
  onToggleTheme,
}: WorkspaceTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span>{title}</span>
      </div>
      <div className="topbar-actions">
        <IconButton
          icon={theme === 'dark' ? <Sun /> : <Moon />}
          label="主题"
          onClick={onToggleTheme}
        />
        <IconButton
          icon={<Settings />}
          label="设置"
          onClick={onOpenSettings}
        />
      </div>
    </header>
  )
}
