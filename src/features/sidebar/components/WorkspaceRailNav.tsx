import {
  Bot,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  Settings,
  Sun,
} from 'lucide-react'
import type { ThemeMode, WorkspaceMode } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface WorkspaceRailNavProps {
  collapsed: boolean
  mode: WorkspaceMode
  theme: ThemeMode
  onModeChange: (mode: WorkspaceMode) => void
  onOpenSettings: () => void
  onToggle: () => void
  onToggleTheme: () => void
}

export function WorkspaceRailNav({
  collapsed,
  mode,
  theme,
  onModeChange,
  onOpenSettings,
  onToggle,
  onToggleTheme,
}: WorkspaceRailNavProps) {
  return (
    <nav className="rail-nav" aria-label="功能区">
      <IconButton
        icon={<PanelsTopLeft />}
        label="工作台"
        active={mode === 'prompt'}
        onClick={() => onModeChange('prompt')}
      />
      <IconButton
        icon={<Bot />}
        label="Skills Lab"
        active={mode === 'skills'}
        onClick={() => onModeChange('skills')}
      />
      <IconButton
        className="rail-theme"
        icon={theme === 'dark' ? <Sun /> : <Moon />}
        label="主题"
        onClick={onToggleTheme}
      />
      <IconButton
        className="rail-settings"
        icon={<Settings />}
        label="设置"
        onClick={onOpenSettings}
      />
      <IconButton
        className="rail-toggle"
        icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        label={collapsed ? '展开' : '收起'}
        onClick={onToggle}
      />
    </nav>
  )
}
