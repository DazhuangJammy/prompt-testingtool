import type { CompletionMessage } from '@/shared/types'

const autoNameableTitles = new Set(['新话题', '测试', '未命名话题'])
const maxGeneratedTopicTitleLength = 14

export function shouldAutoNameChatTopic(title: string) {
  return autoNameableTitles.has(title.trim())
}

export function createTopicTitleMessages(userText: string): CompletionMessage[] {
  return [
    {
      role: 'system',
      content:
        '你负责给聊天话题起一个简短中文标题。只输出标题本身，不要解释，不要引号，不要标点。标题控制在 2 到 12 个汉字，概括用户这次想做的事。',
    },
    {
      role: 'user',
      content: userText.trim().slice(0, 1200),
    },
  ]
}

export function normalizeGeneratedChatTopicTitle(title: string) {
  const compact = title
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/^(标题|话题|名称)\s*[:：]\s*/, '')
    .replace(/^["'“”‘’「」『』【】《》()\s]+/, '')
    .replace(/["'“”‘’「」『』【】《》()\s]+$/, '')
    .replace(/[。.!！?？,，;；:：]+$/, '')
    .trim()

  return Array.from(compact).slice(0, maxGeneratedTopicTitleLength).join('')
}
