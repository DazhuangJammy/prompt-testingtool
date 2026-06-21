import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { buildFallbackSkillGraph } from './skillGraphFallbackService.mjs'
import {
  runCodexForJson,
  runCodexForText,
} from './codexRunnerService.mjs'

export async function analyzeSkill({ topic, settings }) {
  assertSkillPath(topic?.skillPath)
  const fallback = buildFallbackSkillGraph(topic.skillPath)
  const onEvent = topic?.onEvent

  if (settings?.defaultTool === 'mock') {
    await onEvent?.({
      type: 'output',
      stream: 'stdout',
      text: 'Mock agent: 使用本地静态图谱。\n',
    })
    return fallback
  }
  if (settings?.defaultTool && settings.defaultTool !== 'codex') {
    await onEvent?.({
      type: 'output',
      stream: 'stdout',
      text: `${settings.defaultTool} 暂未接入真实流式调用，使用本地静态图谱。\n`,
    })
    return {
      ...fallback,
      graph: {
        ...fallback.graph,
        issues: [
          ...fallback.graph.issues,
          {
            id: 'unsupported-agent-tool',
            severity: 'warning',
            title: '外部工具暂未接入',
            detail: `${settings.defaultTool} 当前只保存为配置项，实际解读使用本地静态兜底。`,
          },
        ],
      },
    }
  }

  try {
    const result = await runCodexForJson({
      cwd: topic.skillPath,
      settings,
      prompt: buildAnalyzePrompt(topic.skillPath),
      agentSessionId: topic.agentSessionId,
      abortSignal: topic.abortSignal,
      onEvent,
    })
    const graph = normalizeGraph(result, topic.skillPath, fallback.graph)
    return {
      graph,
      fileSignature: fallback.fileSignature,
    }
  } catch (error) {
    return {
      ...fallback,
      graph: {
        ...fallback.graph,
        issues: [
          ...fallback.graph.issues,
          {
            id: 'codex-fallback',
            severity: 'warning',
            title: 'Codex 解读失败，已使用本地兜底',
            detail: error instanceof Error ? error.message : '未知错误',
          },
        ],
      },
    }
  }
}

export async function askAboutSkill({ topic, settings, message }) {
  assertSkillPath(topic?.skillPath)
  const onEvent = topic?.onEvent
  if (settings?.defaultTool !== 'codex') {
    await onEvent?.({
      type: 'output',
      stream: 'stdout',
      text: '当前只接入了 Codex 真实调用。\n',
    })
    return {
      answer: '当前只接入了 Codex 真实调用。这个问题已记录，后续可在 Skills 设置中切回 Codex 后重试。',
    }
  }

  const fallback = buildFallbackSkillGraph(topic.skillPath)
  try {
    const answer = await runCodexForText({
      cwd: topic.skillPath,
      settings,
      prompt: buildAskPrompt(message?.content ?? '', fallback.graph),
      agentSessionId: topic.agentSessionId,
      abortSignal: topic.abortSignal,
      onEvent,
    })
    return { answer }
  } catch (error) {
    return {
      answer: `Codex 调用失败：${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

export async function runSkillTask({ topic, settings, mode, prompt }) {
  assertSkillPath(topic?.skillPath)
  const onEvent = topic?.onEvent
  if (settings?.defaultTool !== 'codex') {
    await onEvent?.({
      type: 'output',
      stream: 'stdout',
      text: '当前只接入了 Codex 真实调用。\n',
    })
    return {
      answer: '当前只接入了 Codex 真实调用。这个任务已记录，后续可在 Skills 设置中切回 Codex 后重试。',
    }
  }

  try {
    const answer = await runCodexForText({
      cwd: topic.skillPath,
      settings,
      prompt: buildTaskPrompt(mode, prompt, settings),
      agentSessionId: topic.agentSessionId,
      abortSignal: topic.abortSignal,
      onEvent,
    })
    return { answer }
  } catch (error) {
    return {
      answer: `Codex 调用失败：${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

export async function createSkillWithAgent({ settings, prompt }) {
  const directory = settings?.defaultSkillsDirectory?.trim()
  if (!directory) throw new Error('请先在 Skills 设置中填写默认 Skills 目录')
  if (settings?.permissionMode !== 'allow-write') {
    throw new Error('当前是只读模式。新建 Skill 需要在 Skills 设置中允许外部 agent 写入。')
  }
  mkdirSync(directory, { recursive: true })

  if (settings?.defaultTool !== 'codex') {
    throw new Error('第一版只接入 Codex 新建 Skill')
  }

  const answer = await runCodexForText({
    cwd: directory,
    settings,
    prompt: buildCreateSkillPrompt(prompt, directory),
  })
  const createdPath = extractCreatedPath(answer, directory)
  return {
    answer,
    skillPath: createdPath,
  }
}

function assertSkillPath(skillPath) {
  if (!skillPath || typeof skillPath !== 'string') {
    throw new Error('缺少本地 Skill 文件夹路径')
  }
  if (!existsSync(skillPath)) {
    throw new Error('本地 Skill 文件夹不存在')
  }
  if (!existsSync(join(skillPath, 'SKILL.md'))) {
    throw new Error('所选目录中没有 SKILL.md')
  }
}

function buildAnalyzePrompt(skillPath) {
  return `你是一个 Skills Lab 解析 agent。请只读取当前目录中的 skill，不要修改任何文件。

目标：把这个 skill 解析成一个可视化图谱 JSON。当前 skill 路径：${skillPath}

必须读取：
- SKILL.md
- SKILL.md 明确引用的 references/assets/scripts/tests
- 目录中对理解触发条件、执行步骤、测试方式有帮助的文件

请严格输出一个 JSON 对象，不要使用 Markdown 代码块，不要输出解释文字。JSON 结构如下：
{
  "skill": {
    "name": "string",
    "description": "string",
    "sourcePath": "string",
    "sourceFile": "SKILL.md"
  },
  "summary": "string",
  "nodes": [
    {
      "id": "stable-id",
      "type": "main | reference | asset | script | test | rule | folder | unknown",
      "label": "string",
      "body": "short markdown",
      "file": "relative/path optional",
      "evidence": "short quote or paraphrase from source",
      "confidence": "explicit | rule | inferred"
    }
  ],
  "edges": [
    {
      "id": "stable-id",
      "from": "node id",
      "to": "node id",
      "relation": "reads | uses | runs | triggers | generates | contains | tests | suggests",
      "label": "string",
      "evidence": "short source evidence",
      "confidence": "explicit | rule | inferred"
    }
  ],
  "issues": [
    {
      "id": "stable-id",
      "severity": "info | warning | error",
      "title": "string",
      "detail": "string",
      "nodeId": "optional node id"
    }
  ],
  "testSuggestions": ["string"],
  "generatedAt": "${new Date().toISOString()}"
}

规则：
- SKILL.md 必须是 main 节点。
- 事实关系用 explicit；条件分支或触发规则用 rule；你推断的关系用 inferred。
- 不要把推断当事实。
- 节点和连线数量保持克制，优先 5 到 18 个节点。
- evidence 要短，不能大段复制原文。`
}

function buildAskPrompt(question, graph) {
  return `你是 Skills Lab 的只读讲解 agent。请读取当前 skill 文件夹，根据事实回答用户问题。

当前已有图谱摘要：
${JSON.stringify(
  {
    skill: graph.skill,
    summary: graph.summary,
    nodes: graph.nodes.map(({ id, label, type, file, confidence }) => ({
      id,
      label,
      type,
      file,
      confidence,
    })),
  },
  null,
  2,
)}

用户问题：
${question}

要求：
- 不要修改任何文件。
- 回答要指出依据来自哪个文件或节点。
- 如果不知道，直接说不知道。`
}

function buildTaskPrompt(mode, prompt, settings) {
  const writeRule =
    settings?.permissionMode === 'allow-write'
      ? '可以提出并执行必要修改，但必须尽量小改。'
      : '不要修改任何文件，只给修改建议、测试设计或诊断结论。'
  const taskName = mode === 'test' ? '运行或设计测试' : '提出优化建议'

  return `你是 Skills Lab 的外部 agent。任务类型：${taskName}。

${writeRule}

用户请求：
${prompt}

要求：
- 优先读取 SKILL.md 和相关引用文件。
- 如果运行命令，请说明命令和结果。
- 如果不能运行，请说明原因。
- 输出简洁中文结果。`
}

function buildCreateSkillPrompt(prompt, directory) {
  return `你是 Skills Lab 的 skill 创建 agent。请在当前目录中创建一个新的 Codex skill 文件夹。

用户需求：
${prompt || '创建一个新的 skill'}

目标目录：
${directory}

要求：
- 创建一个 kebab-case 文件夹。
- 文件夹中必须包含 SKILL.md。
- SKILL.md 必须有 frontmatter name 和 description。
- 如有必要，可创建 references/assets/scripts，但不要制造空目录。
- 不要修改其他已有 skill。
- 完成后最后一行必须输出：CREATED_SKILL_PATH=<绝对路径>
- 输出简洁中文总结。`
}

function extractCreatedPath(answer, directory) {
  const explicit = answer.match(/CREATED_SKILL_PATH=(.+)$/m)?.[1]?.trim()
  if (explicit && existsSync(join(explicit, 'SKILL.md'))) return explicit

  const candidates = []
  collectSkillDirectories(directory, candidates)
  const latest = candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)[0]
  if (latest) return latest.path
  return undefined
}

function collectSkillDirectories(directory, result) {
  if (!existsSync(directory)) return
  for (const entry of readdirSafe(directory)) {
    const path = join(directory, entry.name)
    if (!entry.isDirectory()) continue
    if (existsSync(join(path, 'SKILL.md'))) {
      result.push({ path, mtimeMs: entryMtimeMs(path) })
    }
  }
}

function readdirSafe(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function entryMtimeMs(path) {
  try {
    return statSync(path).mtimeMs
  } catch {
    return 0
  }
}

function normalizeGraph(value, skillPath, fallbackGraph) {
  const graph = value && typeof value === 'object' ? value : {}
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : fallbackGraph.nodes
  const edges = Array.isArray(graph.edges) ? graph.edges : fallbackGraph.edges
  const validNodeIds = new Set(nodes.map((node) => node.id).filter(Boolean))

  return {
    skill: {
      name: graph.skill?.name || fallbackGraph.skill.name,
      description: graph.skill?.description || fallbackGraph.skill.description,
      sourcePath: skillPath,
      sourceFile: graph.skill?.sourceFile || 'SKILL.md',
    },
    summary: graph.summary || fallbackGraph.summary,
    nodes: nodes.map((node, index) => ({
      id: String(node.id || `node-${index + 1}`),
      type: normalizeNodeType(node.type),
      label: String(node.label || node.file || `节点 ${index + 1}`),
      body: typeof node.body === 'string' ? node.body : undefined,
      file: typeof node.file === 'string' ? node.file : undefined,
      evidence: typeof node.evidence === 'string' ? node.evidence : undefined,
      confidence: normalizeConfidence(node.confidence),
    })),
    edges: edges
      .filter((edge) => validNodeIds.has(edge.from) && validNodeIds.has(edge.to))
      .map((edge, index) => ({
        id: String(edge.id || `edge-${index + 1}`),
        from: String(edge.from),
        to: String(edge.to),
        relation: normalizeRelation(edge.relation),
        label: typeof edge.label === 'string' ? edge.label : undefined,
        evidence: typeof edge.evidence === 'string' ? edge.evidence : undefined,
        confidence: normalizeConfidence(edge.confidence),
      })),
    issues: Array.isArray(graph.issues)
      ? graph.issues.map((issue, index) => ({
          id: String(issue.id || `issue-${index + 1}`),
          severity: normalizeSeverity(issue.severity),
          title: String(issue.title || '提示'),
          detail: String(issue.detail || ''),
          nodeId: typeof issue.nodeId === 'string' ? issue.nodeId : undefined,
        }))
      : fallbackGraph.issues,
    testSuggestions: Array.isArray(graph.testSuggestions)
      ? graph.testSuggestions.map(String).slice(0, 8)
      : fallbackGraph.testSuggestions,
    generatedAt: new Date().toISOString(),
  }
}

function normalizeNodeType(type) {
  return [
    'main',
    'reference',
    'asset',
    'script',
    'test',
    'rule',
    'folder',
    'unknown',
  ].includes(type)
    ? type
    : 'unknown'
}

function normalizeConfidence(confidence) {
  return ['explicit', 'rule', 'inferred'].includes(confidence)
    ? confidence
    : 'inferred'
}

function normalizeRelation(relation) {
  return [
    'reads',
    'uses',
    'runs',
    'triggers',
    'generates',
    'contains',
    'tests',
    'suggests',
  ].includes(relation)
    ? relation
    : 'uses'
}

function normalizeSeverity(severity) {
  return ['info', 'warning', 'error'].includes(severity) ? severity : 'info'
}
