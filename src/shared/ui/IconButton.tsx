import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { hideTooltip, showTooltip } from '@/shared/ui/tooltip'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  active?: boolean
}

export function IconButton({
  icon,
  label,
  active,
  className = '',
  onBlur,
  onClick,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      data-tooltip={label}
      {...props}
      onBlur={(event) => {
        hideTooltip()
        onBlur?.(event)
      }}
      onClick={(event) => {
        hideTooltip()
        onClick?.(event)
      }}
      onFocus={(event) => {
        showTooltip(event.currentTarget, label)
        onFocus?.(event)
      }}
      onMouseEnter={(event) => {
        showTooltip(event.currentTarget, label)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        hideTooltip()
        onMouseLeave?.(event)
      }}
      onPointerDown={(event) => {
        hideTooltip()
        onPointerDown?.(event)
      }}
    >
      {icon}
    </button>
  )
}
