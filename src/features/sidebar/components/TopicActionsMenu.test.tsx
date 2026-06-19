import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatSession } from '@/shared/types'
import { TopicActionsMenu } from './TopicActionsMenu'

let root: Root | undefined
let host: HTMLDivElement | undefined

const session: ChatSession = {
  id: 'session',
  canvasId: 'canvas',
  title: '测试话题',
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

function renderMenu(onDuplicate = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <TopicActionsMenu
        session={session}
        onDuplicate={onDuplicate}
        onExport={vi.fn()}
        onRename={vi.fn()}
      />,
    )
  })

  act(() => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="话题操作"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  return { onDuplicate }
}

describe('TopicActionsMenu', () => {
  it('shows and runs the duplicate action before export', () => {
    const { onDuplicate } = renderMenu()
    const actionButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.topic-actions-menu > button'),
    )

    expect(actionButtons.map((button) => button.textContent)).toEqual([
      '编辑命名',
      '复制副本',
    ])
    expect(document.body.textContent).toContain('导出')

    act(() => {
      actionButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onDuplicate).toHaveBeenCalledWith(session)
  })
})
