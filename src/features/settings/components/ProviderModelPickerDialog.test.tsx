import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderModelPickerDialog } from './ProviderModelPickerDialog'

let root: Root | undefined
let host: HTMLDivElement | undefined

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

describe('ProviderModelPickerDialog', () => {
  it('filters provider models and adds a selected model', () => {
    const onAddModels = vi.fn()
    renderPicker({ onAddModels })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        .find((button) => button.textContent === '嵌入')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('text-embedding-v4')
    expect(document.body.textContent).not.toContain('qwen3.7-plus')

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="添加模型"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onAddModels).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'text-embedding-v4',
        group: 'text',
        enabled: true,
      }),
    ])
  })

  it('disables already added models', () => {
    renderPicker({ existingModelIds: ['qwen3.7-plus'] })

    const addedButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="已添加"]'),
    )[0]

    expect(addedButton?.disabled).toBe(true)
  })
})

function renderPicker(
  overrides: Partial<Parameters<typeof ProviderModelPickerDialog>[0]> = {},
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ProviderModelPickerDialog
        existingModelIds={[]}
        models={[
          {
            id: 'qwen3.7-plus',
            capabilities: ['chat', 'reasoning', 'function-call'],
            enabled: true,
          },
          {
            id: 'text-embedding-v4',
            capabilities: ['embedding'],
            enabled: true,
          },
        ]}
        providerName="百炼"
        status={{ status: 'ok', message: '已获取 2 个模型，请选择要添加的模型' }}
        onAddModels={vi.fn()}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
        {...overrides}
      />,
    )
  })
}
