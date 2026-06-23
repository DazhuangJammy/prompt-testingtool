import { compilePrompt } from '@/features/prompt-card/model/prompt'
import { appendDefaultAssistantPrompt } from '@/features/settings/model/defaultModelSettings'
import type {
  ChatMessage,
  ChatAttachment,
  CompletionMessage,
  CompareRun,
  PromptCard,
  PromptInjectionMode,
  PromptVersion,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import { buildAttachmentContentParts } from './attachments'
import { splitThinkingBlock } from '@/shared/model/thinking'

export const createPromptVersion = (
  card: PromptCard,
  reason: PromptVersion['reason'],
  defaultAssistantPrompt?: string,
) => {
  const version: PromptVersion = {
    id: crypto.randomUUID(),
    promptCardId: card.id,
    compiledMarkdown: appendDefaultAssistantPrompt(
      compilePrompt(card),
      defaultAssistantPrompt,
    ),
    createdAt: nowIso(),
    reason,
  }
  return version
}

export const buildChatMessages = (
  prompt: string,
  history: ChatMessage[],
  nextUserText: string,
  injectionMode: PromptInjectionMode = 'system',
  nextAttachments: ChatAttachment[] = [],
  knowledgeContext = '',
  webSearchContext = '',
): CompletionMessage[] => [
  {
    role: injectionMode === 'system' ? 'system' : 'user',
    content: [prompt, knowledgeContext, webSearchContext].filter(Boolean).join('\n\n'),
  },
  ...history
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content:
        message.role === 'assistant'
          ? splitThinkingBlock(message.content).answer || message.content
          : buildAttachmentContentParts(message.content, message.attachments),
    })),
  {
    role: 'user',
    content: buildAttachmentContentParts(nextUserText, nextAttachments),
  },
]

export const createCompareRun = (
  promptCardId: string,
  oldVersion: PromptVersion,
  newVersion: PromptVersion,
  input: string,
  oldOutput: string,
  newOutput: string,
) => {
  const run: CompareRun = {
    id: crypto.randomUUID(),
    promptCardId,
    oldVersionId: oldVersion.id,
    newVersionId: newVersion.id,
    input,
    oldOutput,
    newOutput,
    createdAt: nowIso(),
  }
  return run
}
