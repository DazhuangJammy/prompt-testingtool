import { describe, expect, it } from 'vitest'
import {
  createChatSessionExportContent,
  createChatSessionExportFilename,
  createChatSessionExportMessage,
  createMessageExportFilename,
  createMessageExportContent,
  getMessageExportText,
  markdownToWordHtml,
} from './messageExport'

describe('message export model', () => {
  it('exports answer text without thinking by default', () => {
    const message = {
      content: '<think>先分析风险</think># 结论\n\n**可以做**，但要分阶段。',
    }

    expect(getMessageExportText(message, 'markdown')).toBe(
      '# 结论\n\n**可以做**，但要分阶段。',
    )
    expect(getMessageExportText(message, 'plain-text')).toBe(
      '结论\n\n可以做，但要分阶段。',
    )
  })

  it('can include thinking in markdown export', () => {
    const content = createMessageExportContent({
      content: '<think>先分析风险</think>回答内容',
    })

    expect(content.markdownWithThinking).toContain('## 思考')
    expect(content.markdownWithThinking).toContain('先分析风险')
    expect(content.markdownWithThinking).toContain('## 回答')
    expect(content.markdownWithThinking).toContain('回答内容')
  })

  it('falls back when there is no thinking or valid date', () => {
    expect(
      createMessageExportContent({
        content: '回答内容',
      }).markdownWithThinking,
    ).toBe('回答内容')
    expect(createMessageExportFilename({ createdAt: 'bad-date' }, 'md')).toBe(
      'ai-reply-message.md',
    )
  })

  it('converts markdown into simple Word-compatible HTML', () => {
    const html = markdownToWordHtml(
      '# 标题\n\n- 要点\n\n```ts\nconst a = 1\n```\n\n`code`',
    )
    expect(html).toContain(
      '<h1>标题</h1>',
    )
    expect(html).toContain(
      '<p>• 要点</p>',
    )
    expect(html).toContain('<pre>const a = 1</pre>')
    expect(html).toContain(
      '<code>code</code>',
    )
  })

  it('flushes an unfinished code block for Word export', () => {
    expect(markdownToWordHtml('```ts\nconst a = 1')).toContain(
      '<pre>const a = 1</pre>',
    )
  })

  it('keeps image markdown visible in Word-compatible HTML', () => {
    const html = markdownToWordHtml('![a"b](data:image/png;base64,abc)')

    expect(html).toContain('<img')
    expect(html).toContain('alt="a&quot;b"')
    expect(html).toContain('src="data:image/png;base64,abc"')
  })

  it('exports a whole chat session with user and assistant messages', () => {
    const session = {
      title: '计划讨论',
      createdAt: '2026-06-10T10:00:00.000Z',
    }
    const exportMessage = createChatSessionExportMessage(
      session,
      [
        {
          id: 'u',
          sessionId: 's',
          role: 'user',
          content: '帮我做计划',
          createdAt: '2026-06-10T10:00:01.000Z',
        },
        {
          id: 'a',
          sessionId: 's',
          role: 'assistant',
          content: '<think>先拆任务</think>可以分三步。',
          createdAt: '2026-06-10T10:00:02.000Z',
        },
      ],
      true,
    )

    expect(exportMessage.content).toContain('# 计划讨论')
    expect(exportMessage.content).toContain('## 用户')
    expect(exportMessage.content).toContain('帮我做计划')
    expect(exportMessage.content).toContain('## 思考')
    expect(exportMessage.content).toContain('先拆任务')
    expect(createChatSessionExportFilename(session, 'md')).toBe(
      '计划讨论-2026-06-10.md',
    )
  })

  it('exports session content in visible chat order with attachments', () => {
    const content = createChatSessionExportContent(
      { title: '访谈整理' },
      [
        {
          id: 'a',
          sessionId: 's',
          role: 'assistant',
          content: '<think>内部推理</think>收到，我来整理。',
          createdAt: '2026-06-10T10:00:02.000Z',
        },
        {
          id: 'u',
          sessionId: 's',
          role: 'user',
          content: '这是访谈图片',
          attachments: [
            {
              id: 'image',
              kind: 'image',
              name: '访谈.png',
              mimeType: 'image/png',
              size: 1024,
              dataUrl: 'data:image/png;base64,abc',
            },
          ],
          createdAt: '2026-06-10T10:00:01.000Z',
        },
      ],
      false,
    )

    expect(content.markdown.indexOf('## 用户')).toBeLessThan(
      content.markdown.indexOf('## AI'),
    )
    expect(content.markdown).toContain('这是访谈图片')
    expect(content.markdown).toContain('![访谈.png](data:image/png;base64,abc)')
    expect(content.markdown).not.toContain('内部推理')
    expect(content.plainText).toContain('【用户】')
    expect(content.plainText).toContain('[图片: 访谈.png')
  })

  it('falls back for empty sessions, system messages, files, and invalid dates', () => {
    const empty = createChatSessionExportContent({ title: '' }, [], false)
    const mixed = createChatSessionExportContent(
      { title: '系统记录' },
      [
        {
          id: 's',
          sessionId: 's',
          role: 'system',
          content: '',
          attachments: [
            {
              id: 'doc',
              kind: 'document',
              name: 'brief.pdf',
              mimeType: 'application/pdf',
              size: 2048,
            },
          ],
          createdAt: 'bad-date',
        },
      ],
      false,
    )

    expect(empty.markdown).toContain('暂无聊天内容')
    expect(mixed.markdown).toContain('## 系统')
    expect(mixed.markdown).toContain('- brief.pdf（2 KB）')
    expect(mixed.plainText).toContain('[附件: brief.pdf（2 KB）]')
    expect(
      createChatSessionExportFilename(
        { title: '  <>  ', createdAt: 'bad-date' },
        'md',
      ),
    ).toBe('--session.md')
  })
})
