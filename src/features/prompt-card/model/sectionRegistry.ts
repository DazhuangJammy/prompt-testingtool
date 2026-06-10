import type {
  PromptSection,
  PromptSectionKey,
  WorkflowStep,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'

export interface PromptSectionDefinition {
  key: PromptSectionKey
  title: string
  heading: boolean
  kind: 'markdown' | 'workflow'
  compile: (section: PromptSection) => string
  createDefault: () => PromptSection
}

export const defaultStarterPrompt =
  '现在：严格遵循<角色>和<规则>，执行<工作流程>1'

export const defaultWorkflowStepPrompt =
  '深呼吸一口，请逐步思考和推理接下来的每一个步骤，禁止跳过任何一个步骤：'

export const sortWorkflowSteps = (steps: WorkflowStep[] = []) =>
  [...steps].sort((a, b) => a.order - b.order)

const compilePlainSection = (section: PromptSection) => section.markdown.trim()

const compileWorkflowSection = (section: PromptSection) => {
  const blocks = [section.markdown.trim()]

  for (const step of sortWorkflowSteps(section.workflowSteps)) {
    const body = step.markdown.trim()
    const title = step.title.trim()
    if (title || body) {
      blocks.push(`## ${title || '步骤'}${body ? `\n\n${body}` : ''}`)
    }
  }

  return blocks.filter(Boolean).join('\n\n')
}

export const promptSectionRegistry: PromptSectionDefinition[] = [
  {
    key: 'role',
    title: '角色',
    heading: true,
    kind: 'markdown',
    compile: compilePlainSection,
    createDefault: () => ({ markdown: '' }),
  },
  {
    key: 'rules',
    title: '规则',
    heading: true,
    kind: 'markdown',
    compile: compilePlainSection,
    createDefault: () => ({ markdown: '' }),
  },
  {
    key: 'examples',
    title: '例子',
    heading: true,
    kind: 'markdown',
    compile: compilePlainSection,
    createDefault: () => ({ markdown: '' }),
  },
  {
    key: 'workflow',
    title: '工作流程',
    heading: true,
    kind: 'workflow',
    compile: compileWorkflowSection,
    createDefault: () => ({
      markdown: defaultWorkflowStepPrompt,
      workflowSteps: [
        { id: createId(), title: '步骤一', markdown: '', order: 0 },
      ],
    }),
  },
  {
    key: 'outputFormat',
    title: '输出格式',
    heading: true,
    kind: 'markdown',
    compile: compilePlainSection,
    createDefault: () => ({ markdown: '' }),
  },
  {
    key: 'starter',
    title: '启动提示词',
    heading: false,
    kind: 'markdown',
    compile: compilePlainSection,
    createDefault: () => ({ markdown: defaultStarterPrompt }),
  },
]

export const promptSectionKeys = promptSectionRegistry.map(({ key }) => key)

export const workflowSectionDefinition = promptSectionRegistry.find(
  (definition) => definition.kind === 'workflow',
)
