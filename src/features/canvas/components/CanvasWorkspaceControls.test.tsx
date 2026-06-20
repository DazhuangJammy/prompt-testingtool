import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultCanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import { defaultNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import { CanvasWorkspaceControls } from './CanvasWorkspaceControls'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
  return {
    ...actual,
    Panel: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="panel">{children}</div>
    ),
  }
})

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

describe('CanvasWorkspaceControls', () => {
  it('shows a canvas-level stop control while flowchart generation is running', () => {
    const stopGeneration = vi.fn()
    renderControls({
      flowchartGeneration: {
        ...flowchartGeneration,
        generating: true,
        hasPreview: false,
        stopGeneration,
      },
    })

    expect(document.body.textContent).toContain('正在读取流程结构')

    act(() => {
      document
        .querySelector<HTMLButtonElement>('.flowchart-generation-live-status button')
        ?.click()
    })

    expect(stopGeneration).toHaveBeenCalledTimes(1)
  })

  it('hides the loading spinner after preview nodes are visible', () => {
    renderControls({
      flowchartGeneration: {
        ...flowchartGeneration,
        generating: true,
        hasPreview: true,
      },
    })

    expect(document.body.textContent).toContain('正在实时生成流程图')
    expect(document.querySelector('.flowchart-generator-spinner')).toBeNull()
  })
})

function renderControls(
  overrides: Partial<Parameters<typeof CanvasWorkspaceControls>[0]> = {},
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <CanvasWorkspaceControls
        activeFrameStyle={defaultNodeFrameStyle}
        activeTextStyle={{
          backgroundColor: 'transparent',
          color: '#ededed',
          fontSize: 18,
        }}
        activeTool="pan"
        canDelete={false}
        canStyleFrame={false}
        canStyleText={false}
        flowchartGeneration={flowchartGeneration}
        onDeleteSelected={vi.fn()}
        onSelectFrameStyle={vi.fn()}
        onSelectPenColor={vi.fn()}
        onSelectTextStyle={vi.fn()}
        onSelectTool={vi.fn()}
        penColor="#ededed"
        penColors={[{ label: '白色', value: '#ededed' }]}
        toolShortcuts={defaultCanvasToolShortcuts}
        {...overrides}
      />,
    )
  })
}

const flowchartGeneration = {
  closeDialog: vi.fn(),
  dialogOpen: false,
  error: '',
  generationStatus: 'streaming' as const,
  generating: false,
  hasPreview: false,
  openDialog: vi.fn(),
  stopGeneration: vi.fn(),
  submit: vi.fn(),
}
