import { describe, expect, it } from 'vitest'
import {
  addMarkdownChildHeading,
  addMarkdownHeading,
  insertMarkdownChildHeading,
  insertMarkdownChildOutlineNode,
  insertMarkdownHeading,
  moveTopLevelMarkdownHeading,
  updateMarkdownOutlineNode,
} from './markdownEditing'
import {
  compilePrompt,
  createPromptCard,
  defaultSections,
  importMarkdownToPromptCard,
  normalizePromptCard,
  parseMarkdownHeadingBlocks,
  parseMarkdownOutline,
  updatePromptMarkdown,
} from './prompt'
import { defaultWorkflowStepPrompt } from './sectionRegistry'

describe('prompt model', () => {
  it('creates default sections from the registry', () => {
    const sections = defaultSections()

    expect(Object.keys(sections)).toEqual([
      'role',
      'rules',
      'examples',
      'workflow',
      'outputFormat',
      'starter',
    ])
    expect(sections.workflow.markdown).toBe(defaultWorkflowStepPrompt)
    expect(sections.starter.markdown).toContain('严格遵循')
  })

  it('compiles headed sections and keeps starter without heading', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.role.markdown = '专家'
    card.sections.workflow.workflowSteps = [
      { id: 's1', title: '步骤一', markdown: '分析', order: 0 },
    ]

    expect(compilePrompt(card)).toContain('# 角色\n\n专家')
    expect(compilePrompt(card)).toContain('## 步骤一\n\n分析')
    expect(compilePrompt(card)).toContain('现在：严格遵循')
    expect(compilePrompt(card)).not.toContain('# 启动提示词')
  })

  it('normalizes legacy workflow default from first step into section markdown', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.workflow.markdown = ''
    card.sections.workflow.workflowSteps = [
      { id: 's1', title: '步骤一', markdown: defaultWorkflowStepPrompt, order: 0 },
    ]

    const normalized = normalizePromptCard(card)

    expect(normalized.sections.workflow.markdown).toBe(defaultWorkflowStepPrompt)
    expect(normalized.sections.workflow.workflowSteps?.[0].markdown).toBe('')
  })

  it('keeps custom workflow markdown during normalization', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.workflow.markdown = '自定义'
    card.sections.workflow.workflowSteps = [
      { id: 's1', title: '', markdown: '步骤', order: 0 },
    ]

    const normalized = normalizePromptCard(card)

    expect(normalized.sections.workflow.markdown).toBe('自定义')
    expect(normalized.sections.workflow.workflowSteps?.[0].markdown).toBe('步骤')
  })

  it('compiles workflow steps with fallback title', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.workflow.workflowSteps = [
      { id: 's1', title: '', markdown: '执行', order: 0 },
    ]

    expect(compilePrompt(card)).toContain('## 步骤\n\n执行')
  })

  it('compiles empty headed sections without extra body', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.starter.markdown = ''
    card.sections.workflow.markdown = ''
    card.sections.workflow.workflowSteps = []

    expect(compilePrompt(card)).toContain('# 角色')
    expect(compilePrompt(card)).not.toContain('# 启动提示词')
  })

  it('imports markdown into default prompt sections by first-level headings', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(
      card,
      [
        '# 角色',
        '你是分析师',
        '# 规则',
        '只说事实',
        '# 例子',
        '输入 A 输出 B',
        '# 工作流程',
        '先看目标',
        '## 步骤一',
        '拆解任务',
        '# 输出格式',
        'Markdown',
        '现在：开始执行',
      ].join('\n\n'),
    )

    expect(imported.markdown).toContain('# 角色\n\n你是分析师')
    expect(compilePrompt(imported)).toContain('# 工作流程\n\n先看目标')
    expect(imported.sections.role.markdown).toBe('你是分析师')
    expect(imported.sections.rules.markdown).toBe('只说事实')
    expect(imported.sections.examples.markdown).toBe('输入 A 输出 B')
    expect(imported.sections.workflow.markdown).toBe('先看目标\n\n## 步骤一\n\n拆解任务')
    expect(imported.sections.workflow.workflowSteps).toEqual([])
    expect(imported.sections.outputFormat.markdown).toBe('Markdown')
    expect(imported.sections.starter.markdown).toBe('现在：开始执行')
  })

  it('supports bracketed default headings during import', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(
      card,
      ['# 【角色】', '结构化顾问'].join('\n\n'),
    )

    expect(imported.sections.role.markdown).toBe('结构化顾问')
  })

  it('supports default headings with trailing colon during import', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(
      card,
      ['# 角色：', '严格的 svg 代码生成器'].join('\n\n'),
    )

    expect(imported.sections.role.markdown).toBe('严格的 svg 代码生成器')
  })

  it('keeps unrecognized first-level headings in the markdown document', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(
      card,
      ['# 背景', '保留到输出格式', '现在: 直接开始'].join('\n\n'),
    )

    expect(compilePrompt(imported)).toBe(
      ['# 背景', '保留到输出格式', '现在: 直接开始'].join('\n\n'),
    )
    expect(imported.sections.outputFormat.markdown).toBe('# 背景\n\n保留到输出格式')
    expect(imported.sections.starter.markdown).toBe('现在: 直接开始')
    expect(imported.sections.role.markdown).toBe('')
  })

  it('clears sections when importing empty markdown', () => {
    const card = createPromptCard('canvas-1', 0)
    card.sections.role.markdown = '旧角色'

    const imported = importMarkdownToPromptCard(card, '   ')

    expect(imported.markdown).toBe('')
    expect(compilePrompt(imported)).toBe('')
    expect(imported.sections.role.markdown).toBe('')
    expect(imported.sections.outputFormat.markdown).toBe('')
    expect(imported.sections.workflow.workflowSteps).toEqual([])
  })

  it('imports markdown without headings into output format', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(card, '自由格式内容')

    expect(imported.sections.outputFormat.markdown).toBe('自由格式内容')
    expect(imported.sections.starter.markdown).toBe('')
  })

  it('preserves repeated or unknown headed blocks in markdown', () => {
    const card = createPromptCard('canvas-1', 0)

    const imported = importMarkdownToPromptCard(
      card,
      ['# 输出格式', 'JSON', '# 不认识', '额外约束'].join('\n\n'),
    )

    expect(compilePrompt(imported)).toBe('# 输出格式\n\nJSON\n\n# 不认识\n\n额外约束')
    expect(imported.sections.outputFormat.markdown).toBe('JSON\n\n# 不认识\n\n额外约束')
  })

  it('uses edited markdown as the prompt source of truth', () => {
    const card = createPromptCard('canvas-1', 0)

    const edited = updatePromptMarkdown(
      card,
      ['# 角色', '只按标题渲染', '# svg 布局说明', '新增板块'].join('\n\n'),
    )

    expect(compilePrompt(edited)).toBe(
      ['# 角色', '只按标题渲染', '# svg 布局说明', '新增板块'].join('\n\n'),
    )
    expect(parseMarkdownHeadingBlocks(compilePrompt(edited))).toMatchObject([
      { depth: 1, title: '角色', body: '只按标题渲染' },
      { depth: 1, title: 'svg 布局说明', body: '新增板块' },
    ])
  })

  it('parses markdown outline by heading levels', () => {
    const outline = parseMarkdownOutline(
      [
        '# 角色',
        '一级正文',
        '## 能力',
        '二级正文',
        '### 限制',
        '三级正文',
        '# 输出格式',
        'SVG',
      ].join('\n\n'),
    )

    expect(outline.nodes).toHaveLength(2)
    expect(outline.nodes[0]).toMatchObject({
      depth: 1,
      title: '角色',
      ownBody: '一级正文',
    })
    expect(outline.nodes[0].children[0]).toMatchObject({
      depth: 2,
      title: '能力',
      ownBody: '二级正文',
    })
    expect(outline.nodes[0].children[0].children[0]).toMatchObject({
      depth: 3,
      title: '限制',
      ownBody: '三级正文',
    })
  })

  it('ignores hash characters inside fenced code when parsing headings', () => {
    const markdown = [
      '# 输出格式',
      '```svg',
      '<rect fill="#fff" />',
      '# 这不是标题',
      '```',
      '# svg 布局说明',
      '真正的新板块',
    ].join('\n')

    expect(parseMarkdownHeadingBlocks(markdown)).toMatchObject([
      {
        title: '输出格式',
        body: '```svg\n<rect fill="#fff" />\n# 这不是标题\n```',
      },
      { title: 'svg 布局说明', body: '真正的新板块' },
    ])
  })

  it('adds top-level and nested markdown headings', () => {
    const markdown = ['# 角色', '内容', '# 输出格式', 'JSON'].join('\n\n')
    const withSection = addMarkdownHeading(markdown, 1)
    const roleBlock = parseMarkdownHeadingBlocks(markdown)[0]
    const withChild = addMarkdownChildHeading(markdown, roleBlock)

    expect(withSection).toContain('\n\n# 新板块\n')
    expect(withChild).toContain('# 角色\n\n内容\n\n## 新标题\n\n# 输出格式')
  })

  it('returns cursor position at the end of inserted heading titles', () => {
    const markdown = ['# 角色', '内容', '# 输出格式', 'JSON'].join('\n\n')
    const topLevel = insertMarkdownHeading(markdown, 1)
    const roleBlock = parseMarkdownHeadingBlocks(markdown)[0]
    const child = insertMarkdownChildHeading(markdown, roleBlock)

    expect(topLevel.markdown.slice(0, topLevel.cursorIndex).endsWith('# 新板块'))
      .toBe(true)
    expect(child.markdown.slice(0, child.cursorIndex).endsWith('## 新标题'))
      .toBe(true)
  })

  it('adds headings to empty markdown with a clamped heading depth', () => {
    const inserted = insertMarkdownHeading('', 9, '深层标题')

    expect(inserted.markdown).toBe('###### 深层标题\n')
    expect(inserted.cursorIndex).toBe('###### 深层标题'.length)
  })

  it('inserts a child heading at the end of a parent block', () => {
    const markdown = ['# 角色', '内容'].join('\n\n')
    const roleNode = parseMarkdownOutline(markdown).nodes[0]

    const inserted = insertMarkdownChildHeading(markdown, roleNode)

    expect(inserted.markdown).toBe('# 角色\n\n内容\n\n## 新标题\n')
  })

  it('updates only the selected outline node title and own body', () => {
    const markdown = [
      '# 角色',
      '旧正文',
      '## 子标题',
      '子正文',
      '# 输出格式',
      'JSON',
    ].join('\n\n')
    const roleNode = parseMarkdownOutline(markdown).nodes[0]

    const updated = updateMarkdownOutlineNode(
      markdown,
      roleNode,
      '新角色',
      '新正文',
    )

    expect(updated).toContain('# 新角色\n\n新正文\n\n## 子标题\n\n子正文')
    expect(updated).toContain('# 输出格式\n\nJSON')
    expect(updated).not.toContain('旧正文')
  })

  it('falls back to the old title and removes own body for blank local edits', () => {
    const markdown = ['# 角色', '旧正文', '# 输出格式', 'JSON'].join('\n\n')
    const roleNode = parseMarkdownOutline(markdown).nodes[0]

    const updated = updateMarkdownOutlineNode(markdown, roleNode, '   ', '   ')

    expect(updated).toBe('# 角色\n\n# 输出格式\n\nJSON')
  })

  it('inserts child outline headings and returns the inserted node id', () => {
    const markdown = ['# 角色', '内容', '# 输出格式', 'JSON'].join('\n\n')
    const roleNode = parseMarkdownOutline(markdown).nodes[0]

    const inserted = insertMarkdownChildOutlineNode(markdown, roleNode)

    expect(inserted.nodeId).toBeTruthy()
    expect(parseMarkdownOutline(inserted.markdown).nodes[0].children[0])
      .toMatchObject({ id: inserted.nodeId, title: '新标题' })
  })

  it('moves top-level markdown heading blocks with their children', () => {
    const markdown = [
      '# 角色',
      '角色正文',
      '## 子标题',
      '子正文',
      '# 规则',
      '规则正文',
      '# 输出格式',
      'JSON',
    ].join('\n\n')
    const outline = parseMarkdownOutline(markdown)

    const moved = moveTopLevelMarkdownHeading(
      markdown,
      outline.nodes[0].id,
      outline.nodes[1].id,
    )

    expect(moved.startsWith('# 规则\n\n规则正文\n\n# 角色')).toBe(true)
    expect(moved).toContain('## 子标题\n\n子正文')
    expect(moved).toContain('# 输出格式\n\nJSON')
  })

  it('keeps markdown unchanged when moving missing or same headings', () => {
    const markdown = ['# 角色', '内容', '# 输出格式', 'JSON'].join('\n\n')
    const roleNode = parseMarkdownOutline(markdown).nodes[0]

    expect(moveTopLevelMarkdownHeading(markdown, roleNode.id, roleNode.id))
      .toBe(markdown)
    expect(moveTopLevelMarkdownHeading(markdown, 'missing', roleNode.id))
      .toBe(markdown)
  })
})
