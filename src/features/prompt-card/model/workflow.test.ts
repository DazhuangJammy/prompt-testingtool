import { describe, expect, it } from 'vitest'
import {
  createWorkflowStep,
  renderWorkflowPreview,
  reorderWorkflowSteps,
} from './workflow'

describe('workflow model', () => {
  it('creates sequential workflow steps', () => {
    const step = createWorkflowStep(2)

    expect(step.title).toBe('步骤3')
    expect(step.order).toBe(2)
  })

  it('reorders steps by array position', () => {
    const steps = reorderWorkflowSteps([
      { id: 'b', title: 'B', markdown: '', order: 8 },
      { id: 'a', title: 'A', markdown: '', order: 3 },
    ])

    expect(steps.map((step) => step.order)).toEqual([0, 1])
  })

  it('renders markdown workflow preview in order', () => {
    const preview = renderWorkflowPreview('开始', [
      { id: '2', title: '第二', markdown: '后做', order: 1 },
      { id: '1', title: '第一', markdown: '先做', order: 0 },
    ])

    expect(preview).toBe('开始\n\n## 第一\n\n先做\n\n## 第二\n\n后做')
  })
})
