import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeBase, WebSearchSettings } from '@/shared/types'
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

const webSearchSettings: WebSearchSettings = {
  id: 'web-search',
  defaultProviderId: 'bing',
  searchWithTime: true,
  maxResults: 5,
  excludeDomains: [],
  compression: { method: 'none', cutoffLimit: 2000 },
  providers: [
    {
      id: 'bing',
      name: 'Bing',
      type: 'local',
      enabled: true,
      apiHost: 'https://www.bing.com/search',
      apiKeys: [],
    },
    {
      id: 'baidu',
      name: 'Baidu',
      type: 'local',
      enabled: true,
      apiHost: 'https://www.baidu.com/s',
      apiKeys: [],
    },
    {
      id: 'bocha',
      name: 'Bocha',
      type: 'api',
      enabled: true,
      apiHost: 'https://api.bochaai.com',
      apiKeys: [],
    },
  ],
  createdAt: 'now',
  updatedAt: 'now',
}

function createFileDragEvent(type: string, files: File[]) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    dataTransfer: { dropEffect: string; files: File[]; types: string[] }
  }

  Object.defineProperty(event, 'dataTransfer', {
    value: {
      dropEffect: '',
      files,
      types: ['Files'],
    },
  })

  return event
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
  it('adds dropped files through the existing attachment flow', async () => {
    const onAttachmentsChange = vi.fn()
    renderComposer({ onAttachmentsChange })

    const surface = document.querySelector<HTMLElement>('.composer-input-surface')
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' })

    act(() => {
      surface?.dispatchEvent(createFileDragEvent('dragenter', [file]))
    })

    expect(surface?.classList.contains('is-file-dragging')).toBe(true)

    await act(async () => {
      surface?.dispatchEvent(createFileDragEvent('drop', [file]))
      await Promise.resolve()
    })

    expect(surface?.classList.contains('is-file-dragging')).toBe(false)
    expect(onAttachmentsChange).toHaveBeenCalledTimes(1)
    expect(onAttachmentsChange.mock.calls[0]?.[0][0]).toMatchObject({
      kind: 'text',
      mimeType: 'text/plain',
      name: 'note.txt',
      size: 5,
      text: 'hello',
    })
  })

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

  it('opens web search provider menu and enables the selected provider', () => {
    const onWebSearchEnabledChange = vi.fn()
    const onWebSearchProviderChange = vi.fn()
    renderComposer({
      webSearchSettings,
      onWebSearchEnabledChange,
      onWebSearchProviderChange,
    })

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="网络搜索：Bing"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const menu = document.querySelector('.web-search-provider-menu')
    expect(menu?.textContent).toContain('Bing')
    expect(menu?.textContent).toContain('Baidu')
    expect(menu?.textContent).toContain('Bocha')
    expect(menu?.textContent).toContain('免费')
    expect(menu?.textContent).toContain('未配置')

    act(() => {
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('.web-search-provider-menu button'),
      )
        .find((button) => button.textContent?.includes('Baidu'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onWebSearchProviderChange).toHaveBeenCalledWith('baidu')
    expect(onWebSearchEnabledChange).toHaveBeenCalledWith(true)
    expect(document.querySelector('.web-search-provider-menu')).toBeNull()
  })

  it('places quick phrase button after web search and inserts phrase at the caret', () => {
    const onChange = vi.fn()
    renderComposer({
      input: '你好世界',
      onChange,
      quickPhraseGroups: [{ id: 'group', name: '常用', createdAt: 'now', updatedAt: 'now' }],
      quickPhrases: [
        {
          id: 'phrase',
          title: '问候',
          content: '快捷',
          groupId: 'group',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      webSearchSettings,
    })

    const toolbarButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.composer-tool-group > .icon-button, .composer-tool-group > .composer-menu-shell > .icon-button'),
    )
    const labels = toolbarButtons.map((button) => button.getAttribute('aria-label') ?? '')
    const webSearchIndex = labels.findIndex((label) => label.startsWith('网络搜索'))
    const quickPhraseIndex = labels.findIndex((label) => label === '快捷短语')
    expect(webSearchIndex).toBeGreaterThan(-1)
    expect(quickPhraseIndex).toBe(webSearchIndex + 1)

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')
    textarea?.focus()
    textarea?.setSelectionRange(2, 2)

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="快捷短语"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(document.querySelector('.quick-phrase-picker-menu')?.textContent)
      .toContain('问候')
    expect(host?.querySelector('.quick-phrase-picker-menu')).toBeNull()
    expect(document.body.querySelector('.quick-phrase-picker-menu')).not.toBeNull()

    act(() => {
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('.quick-phrase-picker-list button'),
      )
        .find((button) => button.textContent?.includes('问候'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onChange).toHaveBeenCalledWith('你好快捷世界')
  })

  it('directly sends a selected quick phrase when direct send is enabled', () => {
    const onChange = vi.fn()
    const onDirectSendQuickPhrase = vi.fn()
    renderComposer({
      input: '已有输入',
      onChange,
      onDirectSendQuickPhrase,
      quickPhrases: [
        {
          id: 'phrase',
          title: '直接',
          content: '直接发送内容',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    })

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="快捷短语"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      document
        .querySelector<HTMLInputElement>('input[aria-label="直接发送"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('.quick-phrase-picker-list button'),
      )
        .find((button) => button.textContent?.includes('直接'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onDirectSendQuickPhrase).toHaveBeenCalledWith('直接发送内容')
    expect(onChange).not.toHaveBeenCalled()
  })
})
