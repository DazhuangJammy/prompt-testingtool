import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '@/shared/types'
import { DefaultModelSettingsPanel } from './DefaultModelSettingsPanel'

let root: Root | undefined
let host: HTMLDivElement | undefined

const provider: ProviderConfig = {
  id: 'provider',
  name: '百炼',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'qwen-plus',
  enabled: true,
  models: [{ id: 'qwen-plus', name: 'Qwen Plus', enabled: true }],
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

describe('DefaultModelSettingsPanel', () => {
  it('saves the displayed enabled model when the optimization editor is saved', () => {
    const saveMock = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <DefaultModelSettingsPanel providers={[provider]} onSave={saveMock} />,
      )
    })

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="设置提示词优化模型"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      document
        .querySelector<HTMLButtonElement>('.default-model-editor button[type="submit"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantName: '提示词优化助手',
        providerId: 'provider',
        modelId: 'qwen-plus',
      }),
    )
  })

  it('does not render the old assistant summary block', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <DefaultModelSettingsPanel providers={[provider]} onSave={vi.fn()} />,
      )
    })

    expect(document.querySelector('.default-model-summary')).toBeNull()
  })

  it('saves thinking mode for thinking-capable optimization models', async () => {
    const saveMock = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <DefaultModelSettingsPanel
          providers={[provider]}
          settings={{
            id: 'default-model',
            providerId: 'provider',
            modelId: 'qwen-plus',
            assistantName: '提示词优化助手',
            prompt: '',
            thinkingMode: 'off',
            createdAt: 'now',
            updatedAt: 'now',
          }}
          onSave={saveMock}
        />,
      )
    })

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="设置提示词优化模型"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.default-model-thinking')).toBeTruthy()

    await act(async () => {
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '.default-model-thinking-options button',
        ),
      )
        .find((button) => button.textContent?.includes('沉思'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('.default-model-editor button[type="submit"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ thinkingMode: 'deep' }),
    )
  })
})
