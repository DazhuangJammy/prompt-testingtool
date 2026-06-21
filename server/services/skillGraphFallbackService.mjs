import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.json',
  '.js',
  '.mjs',
  '.ts',
  '.tsx',
  '.html',
  '.css',
  '.py',
  '.sh',
])

export function buildFallbackSkillGraph(skillPath) {
  const skillFile = join(skillPath, 'SKILL.md')
  if (!existsSync(skillFile)) {
    throw new Error('所选目录中没有 SKILL.md')
  }

  const markdown = readFileSync(skillFile, 'utf8')
  const files = listSkillFiles(skillPath)
  const generatedAt = new Date().toISOString()
  const name = extractName(markdown) || basename(skillPath)
  const description = extractDescription(markdown)
  const nodes = [
    {
      id: 'skill-md',
      type: 'main',
      label: 'SKILL.md',
      body: description || 'Skill 主说明文件',
      file: 'SKILL.md',
      evidence: firstNonEmptyLine(markdown),
      confidence: 'explicit',
    },
  ]
  const edges = []
  const issues = []

  for (const file of files) {
    if (file === 'SKILL.md') continue
    const node = createFileNode(file)
    nodes.push(node)
    const mentioned = markdown.includes(file) || markdown.includes(file.replace(/\\/g, '/'))
    edges.push({
      id: `skill-md:${file}`,
      from: 'skill-md',
      to: node.id,
      relation: relationForFile(file),
      label: mentioned ? '文档明确引用' : '目录包含',
      evidence: mentioned ? findMentionLine(markdown, file) : `${file} 位于 skill 目录中`,
      confidence: mentioned ? 'explicit' : 'inferred',
    })
  }

  const triggerLines = extractTriggerLines(markdown)
  if (triggerLines.length) {
    nodes.push({
      id: 'trigger-rules',
      type: 'rule',
      label: '触发条件',
      body: triggerLines.join('\n'),
      file: 'SKILL.md',
      evidence: triggerLines[0],
      confidence: 'rule',
    })
    edges.push({
      id: 'skill-md:trigger-rules',
      from: 'skill-md',
      to: 'trigger-rules',
      relation: 'triggers',
      label: '规则触发',
      evidence: triggerLines[0],
      confidence: 'rule',
    })
  }

  if (!files.some((file) => file.includes('test'))) {
    issues.push({
      id: 'no-tests',
      severity: 'warning',
      title: '未发现测试文件',
      detail: '目录中没有明显的 test/eval 文件，建议补一个教学或回归测试场景。',
    })
  }

  return {
    graph: {
      skill: {
        name,
        description,
        sourcePath: skillPath,
        sourceFile: 'SKILL.md',
      },
      summary: `已读取 ${name}。图谱包含 ${nodes.length} 个节点、${edges.length} 条关系线；其中目录包含关系会标为 AI 推断。`,
      nodes,
      edges,
      issues,
      testSuggestions: [
        '给一个应该触发该 skill 的真实用户请求，检查是否会读到正确 reference。',
        '给一个不应该触发该 skill 的相近请求，检查边界是否清楚。',
      ],
      generatedAt,
    },
    fileSignature: createFileSignature(skillPath, files),
  }
}

export function getSkillFileSignature(skillPath) {
  return getSkillFileStatus(skillPath).fileSignature
}

export function getSkillFileStatus(skillPath) {
  if (!skillPath || !existsSync(skillPath)) {
    throw new Error('本地 Skill 文件夹不存在')
  }
  const files = listSkillFiles(skillPath).map((file) => {
    const stats = statSync(join(skillPath, file))
    return {
      path: file,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
    }
  })
  return {
    fileSignature: files
      .map((file) => `${file.path}:${file.size}:${file.mtimeMs}`)
      .join('|'),
    files,
  }
}

export function listLocalSkillDirectories(directory) {
  if (!directory || !existsSync(directory)) return []

  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .filter((entryPath) => safeIsDirectory(entryPath))
    .map((entryPath) => ({
      name: basename(entryPath),
      path: entryPath,
      hasSkillMarkdown: existsSync(join(entryPath, 'SKILL.md')),
    }))
    .filter((entry) => entry.hasSkillMarkdown)
}

function listSkillFiles(skillPath) {
  const result = []
  walk(skillPath, result, skillPath, 0)
  return result.sort((left, right) => left.localeCompare(right))
}

function walk(currentPath, result, root, depth) {
  if (depth > 4) return

  for (const entry of readdirSync(currentPath)) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.DS_Store') continue
    const entryPath = join(currentPath, entry)
    const relativePath = relative(root, entryPath)
    const stats = statSync(entryPath)
    if (stats.isDirectory()) {
      walk(entryPath, result, root, depth + 1)
      continue
    }
    if (stats.size > 1024 * 512) continue
    result.push(relativePath)
  }
}

function safeIsDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function createFileNode(file) {
  return {
    id: `file:${file}`,
    type: nodeTypeForFile(file),
    label: file,
    body: bodyForFile(file),
    file,
    evidence: file,
    confidence: 'inferred',
  }
}

function nodeTypeForFile(file) {
  if (file.includes('/references/') || file.startsWith('references/')) return 'reference'
  if (file.includes('/assets/') || file.startsWith('assets/')) return 'asset'
  if (file.includes('/scripts/') || file.startsWith('scripts/')) return 'script'
  if (file.includes('test') || file.includes('eval')) return 'test'
  return 'unknown'
}

function bodyForFile(file) {
  if (file.startsWith('references/')) return '补充知识或长说明'
  if (file.startsWith('assets/')) return '素材或模板资源'
  if (file.startsWith('scripts/')) return '可执行脚本或辅助工具'
  if (file.includes('test') || file.includes('eval')) return '测试或评估材料'
  return '目录中的辅助文件'
}

function relationForFile(file) {
  const type = nodeTypeForFile(file)
  if (type === 'script') return 'runs'
  if (type === 'test') return 'tests'
  if (type === 'asset') return 'uses'
  return 'reads'
}

function extractName(markdown) {
  const frontMatterName = markdown.match(/^---[\s\S]*?\nname:\s*['"]?([^'"\n]+)['"]?/m)?.[1]
  if (frontMatterName) return frontMatterName.trim()
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function extractDescription(markdown) {
  return (
    markdown.match(/^---[\s\S]*?\ndescription:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim() ??
    markdown
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('---') && !line.startsWith('#')) ??
    ''
  )
}

function extractTriggerLines(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /trigger|触发|when|use when|适用|不适用/i.test(line))
    .slice(0, 6)
    .map((line) => line.trim())
}

function firstNonEmptyLine(markdown) {
  return markdown.split('\n').find((line) => line.trim())?.trim() ?? 'SKILL.md'
}

function findMentionLine(markdown, file) {
  const needle = file.replace(/\\/g, '/')
  return (
    markdown
      .split('\n')
      .find((line) => line.includes(needle) || line.includes(file))
      ?.trim() ?? needle
  )
}

function createFileSignature(skillPath, files) {
  return files
    .map((file) => {
      const fullPath = join(skillPath, file)
      const stats = statSync(fullPath)
      return `${file}:${stats.size}:${stats.mtimeMs}`
    })
    .join('|')
}
