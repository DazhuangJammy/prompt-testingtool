import { createId } from '@/shared/utils/identity'
import { sortWorkflowSteps } from '@/features/prompt-card/model/sectionRegistry'
import type { WorkflowStep } from '@/shared/types'

export const createWorkflowStep = (index: number): WorkflowStep => ({
  id: createId(),
  title: `步骤${index + 1}`,
  markdown: '',
  order: index,
})

export const reorderWorkflowSteps = (steps: WorkflowStep[]) =>
  steps.map((step, order) => ({ ...step, order }))

export const renderWorkflowPreview = (
  markdown: string,
  steps: WorkflowStep[],
) =>
  [
    markdown,
    ...sortWorkflowSteps(steps).map((step) =>
      [`## ${step.title}`, step.markdown].filter(Boolean).join('\n\n'),
    ),
  ]
    .filter(Boolean)
    .join('\n\n')
