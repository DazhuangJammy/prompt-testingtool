import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultCanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import { defaultNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import { CanvasToolbar } from './CanvasToolbar'

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

describe('CanvasToolbar', () => {
  it('places the prompt card tool immediately before the step tool', () => {
    renderToolbar()

    expect(getToolbarButtonLabels().slice(0, 4)).toEqual([
      '1 拖动画布',
      '2 选择',
      '3 提示词',
      '4 步骤',
    ])

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="3 提示词"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(
      Array.from(document.querySelectorAll('.canvas-card-tool-menu button'))
        .map((button) => button.textContent),
    ).toEqual(['输入卡片', '提示词卡片'])
  })
})

function renderToolbar() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <CanvasToolbar
        activeTool="pan"
        canDelete={false}
        canStyleFrame={false}
        canStyleText={false}
        flowchartGenerating={false}
        frameBorderColor={defaultNodeFrameStyle.borderColor}
        frameBorderColors={[{ label: '默认', value: defaultNodeFrameStyle.borderColor }]}
        frameHighlighted={defaultNodeFrameStyle.highlighted}
        penColor="#ededed"
        penColors={[{ label: '白色', value: '#ededed' }]}
        textBackgroundColor="transparent"
        textBackgroundColors={[
          { label: '透明', value: 'transparent' },
        ]}
        textColor="#ededed"
        textColors={[{ label: '白色', value: '#ededed' }]}
        textFontSize={18}
        toolShortcuts={defaultCanvasToolShortcuts}
        onDeleteSelected={vi.fn()}
        onOpenFlowchartGenerator={vi.fn()}
        onSelectFrameBorderColor={vi.fn()}
        onSelectPenColor={vi.fn()}
        onSelectTextBackgroundColor={vi.fn()}
        onSelectTextColor={vi.fn()}
        onSelectTextFontSize={vi.fn()}
        onSelectTool={vi.fn()}
        onToggleFrameHighlight={vi.fn()}
      />,
    )
  })
}

function getToolbarButtonLabels() {
  return [...document.querySelectorAll<HTMLButtonElement>('.canvas-toolbar-group button')]
    .map((button) => button.getAttribute('aria-label'))
    .filter(Boolean)
}
