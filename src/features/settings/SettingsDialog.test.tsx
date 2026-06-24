import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultAppFontId, type AppFontId } from '@/shared/model/appFont'
import { defaultCanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import {
  defaultSelectionMagnifierSettings,
  type SelectionMagnifierSettings,
} from '@/shared/model/selectionMagnifier'
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
  const renderSettings = (
    props: Partial<{
      appFontId: AppFontId
      onAppFontChange: (fontId: AppFontId) => void
      selectionMagnifier: SelectionMagnifierSettings
      onSelectionMagnifierChange: (
        settings: Partial<SelectionMagnifierSettings>,
      ) => void
    }> = {},
  ) => {
    root?.render(
      <SettingsDialog
        open
        appFontId={props.appFontId ?? defaultAppFontId}
        canvasToolShortcuts={defaultCanvasToolShortcuts}
        selectionMagnifier={
          props.selectionMagnifier ?? defaultSelectionMagnifierSettings
        }
        providers={[provider]}
        onAppFontChange={props.onAppFontChange ?? vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onReorderProviders={vi.fn()}
        onResetCanvasToolShortcuts={vi.fn()}
        onSelectionMagnifierChange={props.onSelectionMagnifierChange ?? vi.fn()}
        onSave={vi.fn()}
        onSaveCanvasToolShortcut={vi.fn()}
        onSaveDefaultModelSettings={vi.fn()}
        onSaveSkillsLabSettings={vi.fn()}
        onSaveWebSearchSettings={vi.fn()}
        onSelect={vi.fn()}
        quickPhraseGroups={[]}
        quickPhrases={[]}
      />
    )
  }

  it('opens shortcuts as a standalone settings page', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('快捷键设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.shortcut-settings-page')).toBeTruthy()
    expect(document.querySelector('.default-model-card')).toBeNull()
    expect(document.querySelectorAll('.shortcut-settings-row')).toHaveLength(8)
  })

  it('shows both default model usages on the default model page', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('默认模型'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('提示词优化模型')
    expect(document.body.textContent).toContain('流程图模型')
  })

  it('folds the selection magnifier controls when the switch is off', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('其他设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.other-settings-page')).toBeTruthy()
    expect(
      document.querySelector<HTMLSelectElement>('select[aria-label="全站字体"]')
        ?.value,
    ).toBe(defaultAppFontId)
    expect(document.body.textContent).toContain('高级字体预览')
    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="启用放大镜"]')
        ?.checked,
    ).toBe(false)
    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="放大镜字号"]'),
    ).toBeNull()
    expect(document.querySelector('input[aria-label="放大镜边框颜色"]')).toBeNull()
    expect(document.querySelector('input[aria-label="放大镜边框圆角"]')).toBeNull()
    expect(document.querySelector('input[aria-label="放大镜背景色"]')).toBeNull()
    expect(
      document.querySelector('input[aria-label="放大镜背景透明度"]'),
    ).toBeNull()
  })

  it('expands the selection magnifier controls when the switch is on', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings({
        selectionMagnifier: {
          ...defaultSelectionMagnifierSettings,
          enabled: true,
        },
      })
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('其他设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="启用放大镜"]')
        ?.checked,
    ).toBe(true)
    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="放大镜字号"]')
        ?.value,
    ).toBe(String(defaultSelectionMagnifierSettings.fontSize))
    expect(document.querySelector('input[aria-label="放大镜边框颜色"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="放大镜边框圆角"]')).toBeTruthy()
    expect(document.querySelector('input[aria-label="放大镜背景色"]')).toBeTruthy()
    expect(
      document.querySelector('input[aria-label="放大镜背景透明度"]'),
    ).toBeTruthy()
  })

  it('saves the selected global font from other settings', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const onAppFontChange = vi.fn()

    act(() => {
      renderSettings({ onAppFontChange })
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('其他设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const fontSelect = document.querySelector<HTMLSelectElement>(
      'select[aria-label="全站字体"]',
    )
    expect(fontSelect?.options).toHaveLength(10)

    act(() => {
      if (!fontSelect) return
      fontSelect.value = 'lxgw-wenkai'
      fontSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onAppFontChange).toHaveBeenCalledWith('lxgw-wenkai')
  })

  it('opens Skills Lab settings as a standalone settings page', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('Skills 设置'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.skills-settings-page')).toBeTruthy()
    expect(document.body.textContent).toContain('工具命令')
    expect(document.body.textContent).toContain('默认 Skills 目录')
  })

  it('places quick phrase settings below shortcuts and above other settings', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    const labels = Array.from(
      document.querySelectorAll<HTMLButtonElement>('nav button'),
    ).map((button) => button.textContent ?? '')
    const shortcutsIndex = labels.findIndex((label) =>
      label.includes('快捷键设置'),
    )
    const quickPhrasesIndex = labels.findIndex((label) =>
      label.includes('快捷短语'),
    )
    const otherIndex = labels.findIndex((label) => label.includes('其他设置'))

    expect(shortcutsIndex).toBeLessThan(quickPhrasesIndex)
    expect(quickPhrasesIndex).toBeLessThan(otherIndex)

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('快捷短语'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.quick-phrase-settings-page')).toBeTruthy()
    expect(document.body.textContent).toContain('添加短语')
  })

  it('keeps web search general settings separate from provider settings', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      renderSettings()
    })

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('nav button'))
        .find((button) => button.textContent?.includes('网络搜索'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.web-search-general-card')).toBeTruthy()
    expect(document.querySelector('.web-search-provider-card')).toBeNull()
    expect(document.body.textContent).toContain('基础设置')
    expect(document.body.textContent).toContain('默认搜索')

    act(() => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('.provider-items button'))
        .find((button) => button.textContent?.includes('Bing'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.web-search-general-card')).toBeNull()
    expect(document.querySelector('.web-search-provider-card')).toBeTruthy()
    expect(document.body.textContent).toContain('服务商配置')
    expect(document.body.textContent).not.toContain('默认搜索')

    act(() => {
      document
        .querySelector<HTMLButtonElement>('.web-search-general-entry')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('.web-search-general-card')).toBeTruthy()
    expect(document.querySelector('.web-search-provider-card')).toBeNull()
  })
})
