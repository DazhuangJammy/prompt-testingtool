import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Canvas } from '@/shared/types'
import { ProjectActionsMenu } from './ProjectActionsMenu'

let root: Root | undefined
let host: HTMLDivElement | undefined

const canvas: Canvas = {
  id: 'canvas',
  title: '测试工作台',
  createdAt: 'now',
  updatedAt: 'now',
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

function renderMenu(onRename = vi.fn(), onDelete = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ProjectActionsMenu
        canvas={canvas}
        onDelete={onDelete}
        onRename={onRename}
      />,
    )
  })

  act(() => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="工作台操作"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  return { onDelete, onRename }
}

describe('ProjectActionsMenu', () => {
  it('renders the menu outside the clipped project tree', () => {
    renderMenu()

    const menu = document.querySelector('.project-menu')

    expect(menu?.parentElement).toBe(document.body)
    expect(menu?.textContent).toContain('重命名工作台')
    expect(menu?.textContent).toContain('删除工作台')
  })

  it('runs project actions from the portal menu', () => {
    const { onDelete, onRename } = renderMenu()
    const actionButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.project-menu > button'),
    )

    act(() => {
      actionButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRename).toHaveBeenCalledWith(canvas)

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="工作台操作"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const nextButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.project-menu > button'),
    )
    act(() => {
      nextButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDelete).toHaveBeenCalledWith(canvas)
  })
})
