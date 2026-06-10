import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import type { WorkflowStep } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { createWorkflowStep } from '@/features/prompt-card/model/workflow'
import { WorkflowStepEditor } from './WorkflowStepEditor'

interface WorkflowEditorProps {
  sensors: SensorDescriptor<SensorOptions>[]
  steps: WorkflowStep[]
  onChange: (steps: WorkflowStep[]) => void
}

export function WorkflowEditor({ sensors, steps, onChange }: WorkflowEditorProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((step) => step.id === active.id)
    const newIndex = steps.findIndex((step) => step.id === over.id)
    onChange(arrayMove(steps, oldIndex, newIndex))
  }

  const updateStep = (nextStep: WorkflowStep) => {
    onChange(steps.map((step) => (step.id === nextStep.id ? nextStep : step)))
  }

  return (
    <div className="workflow-editor">
      <div className="workflow-head">
        <span>步骤</span>
        <IconButton
          icon={<Plus />}
          label="步骤"
          onClick={() => onChange([...steps, createWorkflowStep(steps.length)])}
        />
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={steps.map((step) => step.id)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step) => (
            <WorkflowStepEditor
              key={`${step.id}-${step.order}`}
              step={step}
              onChange={updateStep}
              onDelete={() =>
                onChange(steps.filter((itemStep) => itemStep.id !== step.id))
              }
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
