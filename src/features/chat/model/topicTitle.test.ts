import { describe, expect, it } from 'vitest'
import {
  createTopicTitleMessages,
  normalizeGeneratedChatTopicTitle,
  shouldAutoNameChatTopic,
} from './topicTitle'

describe('topic title model', () => {
  it('only auto names untouched default topics', () => {
    expect(shouldAutoNameChatTopic('新话题')).toBe(true)
    expect(shouldAutoNameChatTopic(' 测试 ')).toBe(true)
    expect(shouldAutoNameChatTopic('用户自己的标题')).toBe(false)
  })

  it('normalizes model generated titles', () => {
    expect(normalizeGeneratedChatTopicTitle('标题：整理课程表。')).toBe('整理课程表')
    expect(normalizeGeneratedChatTopicTitle('"写乐高机器人故事"')).toBe(
      '写乐高机器人故事',
    )
    expect(normalizeGeneratedChatTopicTitle('一个非常非常非常非常非常长的标题')).toBe(
      '一个非常非常非常非常非常长的',
    )
  })

  it('builds short title request messages from user text', () => {
    const messages = createTopicTitleMessages('  帮我做计划  ')

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1]).toEqual({ role: 'user', content: '帮我做计划' })
  })
})
