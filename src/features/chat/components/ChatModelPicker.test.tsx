import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '@/shared/types'
import { ChatModelPicker } from './ChatModelPicker'

let root: Root | undefined
let host: HTMLDivElement | undefined

const providers: ProviderConfig[] = [
  {
    id: 'deep::deepseek-v4-flash',
    sourceProviderId: 'deep',
    name: '深度求索 · deepseek-v4-flash',
    baseUrl: 'https://api.example.test',
    apiKey: 'key',
    model: 'deepseek-v4-flash',
    enabled: true,
    models: [
      {
        id: 'deepseek-v4-flash',
        capabilities: ['chat', 'reasoning', 'function-call'],
        enabled: true,
      },
    ],
    createdAt: 'now',
    updatedAt: 'now',
  },
  {
    id: 'deep::deepseek-v4-pro',
    sourceProviderId: 'deep',
    name: '深度求索 · deepseek-v4-pro',
    baseUrl: 'https://api.example.test',
    apiKey: 'key',
    model: 'deepseek-v4-pro',
    enabled: true,
    models: [
      {
        id: 'deepseek-v4-pro',
        capabilities: ['chat', 'reasoning', 'function-call'],
        enabled: true,
      },
    ],
    createdAt: 'now',
    updatedAt: 'now',
  },
  {
    id: 'dashscope::text-embedding-v4',
    sourceProviderId: 'dashscope',
    name: '阿里云百炼 · Text Embedding V4',
    baseUrl: 'https://api.example.test',
    apiKey: 'key',
    model: 'text-embedding-v4',
    enabled: true,
    models: [
      {
        id: 'text-embedding-v4',
        name: 'Text Embedding V4',
        capabilities: ['embedding'],
        enabled: true,
      },
    ],
    createdAt: 'now',
    updatedAt: 'now',
  },
  {
    id: 'dashscope::gte-rerank-v2',
    sourceProviderId: 'dashscope',
    name: '阿里云百炼 · GTE Rerank V2',
    baseUrl: 'https://api.example.test',
    apiKey: 'key',
    model: 'gte-rerank-v2',
    enabled: true,
    models: [
      {
        id: 'gte-rerank-v2',
        name: 'GTE Rerank V2',
        capabilities: ['embedding', 'rerank'],
        enabled: true,
      },
    ],
    createdAt: 'now',
    updatedAt: 'now',
  },
]

function renderPicker(onSelectProvider = vi.fn<(id: string) => void>()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ChatModelPicker
        activeProviderId="deep::deepseek-v4-flash"
        providers={providers}
        onSelectProvider={onSelectProvider}
      />,
    )
  })

  return { onSelectProvider }
}

function openPicker() {
  act(() => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="选择模型"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function changeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
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

describe('ChatModelPicker', () => {
  it('groups selectable models by provider and selects a model', () => {
    const { onSelectProvider } = renderPicker()

    openPicker()

    expect(document.querySelector('.chat-model-popover')).toBeTruthy()
    expect(
      Array.from(document.querySelectorAll('.chat-model-group-label')).map(
        (item) => item.textContent,
      ),
    ).toEqual(['深度求索'])
    expect(document.body.textContent).not.toContain('Text Embedding V4')
    expect(document.body.textContent).not.toContain('GTE Rerank V2')

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('.chat-model-row'))
        .find((button) => button.textContent?.includes('deepseek-v4-pro'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelectProvider).toHaveBeenCalledWith('deep::deepseek-v4-pro')
    expect(document.querySelector('.chat-model-popover')).toBeNull()
  })

  it('filters models by chat capability tags and keeps knowledge-only models hidden', () => {
    renderPicker()

    openPicker()

    expect(
      Array.from(document.querySelectorAll<HTMLButtonElement>('.chat-model-chip')).map(
        (button) => button.textContent,
      ),
    ).toEqual(['推理', '工具'])

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('.chat-model-chip'))
        .find((button) => button.textContent?.includes('推理'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('deepseek-v4-pro')
    expect(document.body.textContent).not.toContain('Text Embedding V4')
    expect(document.body.textContent).not.toContain('GTE Rerank V2')
  })

  it('searches across provider and model names', () => {
    renderPicker()

    openPicker()
    act(() => {
      const input = document.querySelector<HTMLInputElement>('.chat-model-search input')
      changeInputValue(input!, 'embedding')
    })

    expect(document.body.textContent).toContain('没有匹配的模型')
    expect(document.body.textContent).not.toContain('Text Embedding V4')
    expect(document.body.textContent).not.toContain('GTE Rerank V2')
    expect(document.body.textContent).not.toContain('deepseek-v4-pro')
  })
})
