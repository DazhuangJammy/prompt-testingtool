let tooltipTimer: number | undefined

export const hideTooltip = () => {
  if (tooltipTimer) {
    window.clearTimeout(tooltipTimer)
    tooltipTimer = undefined
  }
  document.querySelectorAll('.floating-tooltip').forEach((tooltip) => tooltip.remove())
}

export const showTooltip = (target: HTMLElement, label: string) => {
  hideTooltip()
  const rect = target.getBoundingClientRect()
  const tooltip = document.createElement('div')
  tooltip.className = 'floating-tooltip'
  tooltip.textContent = label
  document.body.appendChild(tooltip)

  const tooltipRect = tooltip.getBoundingClientRect()
  const top = rect.bottom + 8
  const left = rect.left + rect.width / 2 - tooltipRect.width / 2
  tooltip.style.top = `${Math.min(top, window.innerHeight - tooltipRect.height - 8)}px`
  tooltip.style.left = `${Math.max(
    8,
    Math.min(left, window.innerWidth - tooltipRect.width - 8),
  )}px`
  tooltipTimer = window.setTimeout(hideTooltip, 1500)
}
