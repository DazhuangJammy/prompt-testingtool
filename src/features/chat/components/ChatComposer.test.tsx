import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatComposer } from './ChatComposer'

let root: Root | undefined
let host: HTMLDivElement | undefined

function renderComposer() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ChatComposer
        attachmentCapability={{
          supportsDocuments: false,
          supportsImages: false,
          supportsTextFiles: true,
        }}
        attachments={[]}
        busy={false}
        canClearMessages={false}
        disabled={false}
        input=""
        promptInjectionMode="system"
        supportsDeepThinking={false}
        supportsThinking={false}
        thinkingMode="off"
        onAttachmentsChange={vi.fn()}
        onChange={vi.fn()}
        onClearMessages={vi.fn()}
        onPromptInjectionModeChange={vi.fn()}
        onSend={vi.fn()}
        onThinkingModeChange={vi.fn()}
      />,
    )
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('ChatComposer', () => {
  it('shows unsupported attachment errors as a centered temporary toast', () => {
    vi.useFakeTimers()
    renderComposer()

    const textarea = document.querySelector('textarea')
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    const pasteEvent = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData: { files: File[] } }
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { files: [file] },
    })

    act(() => {
      textarea?.dispatchEvent(pasteEvent)
    })

    const toast = document.querySelector('.composer-error-toast')
    expect(toast?.getAttribute('role')).toBe('alert')
    expect(toast?.textContent).toBe('image.png：当前模型不支持图片输入')
    expect(document.querySelector('.composer-error')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(document.querySelector('.composer-error-toast')).toBeNull()
  })
})
