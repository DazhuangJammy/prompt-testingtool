import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeBase } from '@/shared/types'
import { ChatComposer } from './ChatComposer'

let root: Root | undefined
let host: HTMLDivElement | undefined

function renderComposer(
  props: Partial<ComponentProps<typeof ChatComposer>> = {},
) {
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
        {...props}
      />,
    )
  })
}

const knowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb-test',
    name: '测试',
    providerType: 'local',
    config: {
      chunkSize: 800,
      chunkOverlap: 120,
      topK: 4,
      threshold: 0.2,
      rerankEnabled: false,
    },
    createdAt: 'now',
    updatedAt: 'now',
  },
]

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

  it('renders selected knowledge bases as removable tags after menu selection', () => {
    const onKnowledgeSelectionChange = vi.fn()
    renderComposer({
      knowledgeBases,
      onKnowledgeSelectionChange,
      selectedKnowledgeBaseIds: [],
    })

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="知识库"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('.knowledge-menu button'))
        .find((button) => button.textContent?.includes('测试'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onKnowledgeSelectionChange).toHaveBeenLastCalledWith(['kb-test'])

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
          knowledgeBases={knowledgeBases}
          promptInjectionMode="system"
          selectedKnowledgeBaseIds={['kb-test']}
          supportsDeepThinking={false}
          supportsThinking={false}
          thinkingMode="off"
          onAttachmentsChange={vi.fn()}
          onChange={vi.fn()}
          onClearMessages={vi.fn()}
          onKnowledgeSelectionChange={onKnowledgeSelectionChange}
          onPromptInjectionModeChange={vi.fn()}
          onSend={vi.fn()}
          onThinkingModeChange={vi.fn()}
        />,
      )
    })

    expect(document.querySelector('.composer-knowledge-tags')?.textContent).toContain('测试')

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="移除 测试"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onKnowledgeSelectionChange).toHaveBeenLastCalledWith([])
  })

  it('does not render knowledge tags when no base is selected', () => {
    renderComposer({
      knowledgeBases,
      selectedKnowledgeBaseIds: [],
    })

    expect(document.querySelector('.composer-knowledge-tags')).toBeNull()
    expect(document.querySelector('.knowledge-pill')).toBeNull()
  })
})
