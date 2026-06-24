import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProviderModelList } from './ProviderModelList'

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

describe('ProviderModelList', () => {
  it('renders model capabilities on the same row level as the model name', () => {
    renderList()

    const firstRow = document.querySelector('.provider-model-row')
    const name = firstRow?.querySelector('.provider-model-name')
    const tags = firstRow?.querySelector('.provider-model-tags')

    expect(firstRow).toBeTruthy()
    expect(name?.textContent).toContain('qwen3.7-plus')
    expect(tags?.textContent).not.toContain('对话')
    expect(tags?.textContent).not.toContain('视觉')
    expect(tags?.textContent).not.toContain('推理')
    expect(tags?.querySelector('[aria-label="视觉"]')).toBeTruthy()
    expect(tags?.querySelector('[aria-label="推理"]')).toBeTruthy()
    expect(tags?.querySelector('[aria-label="工具"]')).toBeTruthy()
    expect(tags?.parentElement).toBe(firstRow)
    expect(name?.contains(tags ?? null)).toBe(false)
  })

  it('calls the list actions without changing row structure', () => {
    const onAdd = vi.fn()
    const onSync = vi.fn()
    renderList({ onAdd, onSync })

    act(() => {
      document
        .querySelector<HTMLButtonElement>('.model-sync-button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      document
        .querySelector<HTMLButtonElement>('button[aria-label="添加模型"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSync).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledTimes(1)
  })
})

function renderList(overrides: Partial<Parameters<typeof ProviderModelList>[0]> = {}) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ProviderModelList
        models={[
          {
            id: 'qwen3.7-plus',
            group: 'qwen3',
            capabilities: ['chat', 'reasoning', 'vision', 'function-call'],
            enabled: true,
          },
          {
            id: 'text-embedding-v4',
            group: 'text-embedding',
            capabilities: ['embedding'],
            enabled: true,
          },
        ]}
        syncing={false}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onSync={vi.fn()}
        onToggle={vi.fn()}
        {...overrides}
      />,
    )
  })
}
