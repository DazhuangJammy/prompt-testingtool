import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '@/shared/types'
import { MessageList } from './MessageList'

let root: Root | undefined
let host: HTMLDivElement | undefined

const userMessage: ChatMessage = {
  id: 'user-message',
  sessionId: 'session-1',
  role: 'user',
  content: '请帮我分析',
  createdAt: '2026-07-11T10:00:00.000Z',
}

const streamingAssistantMessage: ChatMessage = {
  id: 'assistant-message',
  sessionId: 'session-1',
  role: 'assistant',
  content: '',
  status: 'streaming',
  createdAt: '2026-07-11T10:00:01.000Z',
}

function renderMessageList(messages: ChatMessage[], generating = false) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <MessageList
        generating={generating}
        messages={messages}
        onEdit={vi.fn()}
        onResend={vi.fn()}
      />,
    )
  })
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host?.remove()
  host = undefined
})

describe('MessageList assistant loading state', () => {
  it('shows one three-dot status while an empty assistant reply is streaming', () => {
    renderMessageList([userMessage, streamingAssistantMessage], true)

    const indicators = document.querySelectorAll('[role="status"]')
    const bubble = document.querySelector('.message-bubble.is-loading')

    expect(indicators).toHaveLength(1)
    expect(indicators[0].getAttribute('aria-label')).toBe('模型正在思考')
    expect(indicators[0].querySelectorAll('span')).toHaveLength(3)
    expect(bubble).toBeTruthy()
  })

  it('shows a temporary assistant status before its message is stored', () => {
    renderMessageList([userMessage], true)

    expect(document.querySelector('[role="status"]')).toBeTruthy()
    expect(document.querySelector('.message-list')?.getAttribute('aria-busy')).toBe(
      'true',
    )
  })

  it('keeps the status visible for thinking-only output until the answer starts', () => {
    renderMessageList(
      [
        {
          ...streamingAssistantMessage,
          content: '<think>正在拆解问题</think>',
          thinkingMode: 'on',
        },
      ],
      true,
    )

    expect(document.querySelector('.thinking-box')).toBeTruthy()
    expect(document.querySelector('[role="status"]')).toBeTruthy()
  })

  it('hides the status after answer content arrives', () => {
    renderMessageList(
      [{ ...streamingAssistantMessage, content: '第一段回答' }],
      true,
    )

    expect(document.body.textContent).toContain('第一段回答')
    expect(document.querySelector('[role="status"]')).toBeNull()
  })

  it('does not animate a stale streaming message after the request fails', () => {
    renderMessageList([streamingAssistantMessage])

    expect(document.querySelector('[role="status"]')).toBeNull()
    expect(document.querySelector('.message-bubble.is-loading')).toBeNull()
  })

  it('does not reactivate a stale streaming message during a newer request', () => {
    renderMessageList([streamingAssistantMessage, userMessage], true)

    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(document.querySelectorAll('.message-bubble.is-loading')).toHaveLength(1)
  })
})
