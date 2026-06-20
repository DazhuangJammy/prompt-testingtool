import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import type {
  PromptSectionKey,
  WorkflowStep,
} from '@/shared/types'
import type { PromptSectionDefinition } from '@/features/prompt-card/model/sectionRegistry'
import { renderWorkflowPreview } from '@/features/prompt-card/model/workflow'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import { MarkdownTextarea } from './MarkdownTextarea'
import { WorkflowEditor } from './WorkflowEditor'

interface PromptSectionAccordionProps {
  collapsed: boolean
  definition: PromptSectionDefinition
  markdown: string
  mode: 'edit' | 'preview'
  promptId: string
  sensors: SensorDescriptor<SensorOptions>[]
  steps: WorkflowStep[]
  onMarkdownChange: (key: PromptSectionKey, value: string) => void
  onStepsChange: (steps: WorkflowStep[]) => void
  onToggle: (key: PromptSectionKey) => void
}

export function PromptSectionAccordion({
  collapsed,
  definition,
  markdown,
  mode,
  promptId,
  sensors,
  steps,
  onMarkdownChange,
  onStepsChange,
  onToggle,
}: PromptSectionAccordionProps) {
  const preview =
    definition.kind === 'workflow'
      ? renderWorkflowPreview(markdown, steps)
      : markdown || ' '

  return (
    <section
      className={`section-accordion ${collapsed ? 'is-collapsed' : ''}`}
    >
      <button
        type="button"
        className="section-accordion-head"
        onClick={() => onToggle(definition.key)}
      >
        {collapsed ? <ChevronRight /> : <ChevronDown />}
        <span>{definition.title}</span>
      </button>

      {!collapsed &&
        (mode === 'edit' ? (
          <div className="section-editor nodrag nopan nowheel">
            <MarkdownTextarea
              key={`${promptId}-${definition.key}`}
              value={markdown}
              onCommit={(value) => onMarkdownChange(definition.key, value)}
            />
            {definition.kind === 'workflow' && (
              <WorkflowEditor
                sensors={sensors}
                steps={steps}
                onChange={onStepsChange}
              />
            )}
          </div>
        ) : (
          <div className="markdown-preview nodrag nopan nowheel">
            <MarkdownRenderer>{preview}</MarkdownRenderer>
          </div>
        ))}
    </section>
  )
}
