import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultCanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import type { ProviderConfig } from '@/shared/types'
import { SettingsDialog } from './SettingsDialog'

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

describe('SettingsDialog', () => {
  it('opens shortcuts as a standalone settings page', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <SettingsDialog
          open
          canvasToolShortcuts={defaultCanvasToolShortcuts}
          providers={[provider]}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onReorderProviders={vi.fn()}
          onResetCanvasToolShortcuts={vi.fn()}
          onSave={vi.fn()}
          onSaveCanvasToolShortcut={vi.fn()}
          onSaveDefaultModelSettings={vi.fn()}
          onSelect={vi.fn()}
        />,
      )
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('快捷键设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.shortcut-settings-page')).toBeTruthy()
    expect(document.querySelector('.default-model-card')).toBeNull()
    expect(document.querySelectorAll('.shortcut-settings-row')).toHaveLength(7)
  })
})
