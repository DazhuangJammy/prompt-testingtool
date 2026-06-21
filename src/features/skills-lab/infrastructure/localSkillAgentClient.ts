import type {
  SkillAgentTool,
  SkillFileStatus,
  SkillGraph,
  SkillLabMessage,
  SkillTopic,
  SkillsLabSettings,
} from '@/shared/types'

interface SkillAgentResponse {
  graph?: SkillGraph
  answer?: string
  fileSignature?: string
  agentSessionId?: string
  error?: string
}

export type SkillAgentStreamEvent =
  | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'session'; sessionId: string }
  | { type: 'result'; result: SkillAgentResponse }
  | { type: 'error'; error: string }

interface SkillDirectoryListResponse {
  skills?: Array<{ name: string; path: string; hasSkillMarkdown: boolean }>
  error?: string
}

interface SkillStatusResponse {
  fileSignature?: string
  files?: SkillFileStatus['files']
  error?: string
}

interface CreateSkillResponse {
  answer?: string
  skillPath?: string
  error?: string
}

export async function listLocalSkills(directory: string) {
  const response = await fetch('/api/skills/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory }),
  })
  const payload = (await response.json().catch(() => null)) as
    | SkillDirectoryListResponse
    | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '读取 Skills 目录失败')
  }
  return payload?.skills ?? []
}

export async function analyzeSkillWithLocalAgent(
  topic: SkillTopic,
  settings: SkillsLabSettings,
) {
  return postSkillAgent('/api/skills/analyze', {
    topic,
    settings,
  })
}

export async function streamAnalyzeSkillWithLocalAgent(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  onEvent: (event: SkillAgentStreamEvent) => void | Promise<void>,
) {
  return postSkillAgentStream('/api/skills/analyze/stream', {
    topic,
    settings,
  }, onEvent)
}

export async function askSkillAgent(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  message: SkillLabMessage,
) {
  return postSkillAgent('/api/skills/ask', {
    topic,
    settings,
    message,
  })
}

export async function streamAskSkillAgent(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  message: SkillLabMessage,
  onEvent: (event: SkillAgentStreamEvent) => void | Promise<void>,
) {
  return postSkillAgentStream('/api/skills/ask/stream', {
    topic,
    settings,
    message,
  }, onEvent)
}

export async function runSkillAgentTask(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  mode: 'suggest' | 'test',
  prompt: string,
) {
  return postSkillAgent('/api/skills/task', {
    topic,
    settings,
    mode,
    prompt,
  })
}

export async function streamSkillAgentTask(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  mode: 'suggest' | 'test',
  prompt: string,
  onEvent: (event: SkillAgentStreamEvent) => void | Promise<void>,
) {
  return postSkillAgentStream('/api/skills/task/stream', {
    topic,
    settings,
    mode,
    prompt,
  }, onEvent)
}

export async function getLocalSkillFileSignature(skillPath: string) {
  return (await getLocalSkillStatus(skillPath)).fileSignature
}

export async function getLocalSkillStatus(skillPath: string): Promise<SkillFileStatus> {
  const response = await fetch('/api/skills/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillPath }),
  })
  const payload = (await response.json().catch(() => null)) as
    | SkillStatusResponse
    | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '读取 Skill 文件状态失败')
  }
  return {
    fileSignature: payload?.fileSignature,
    files: payload?.files ?? [],
  }
}

export async function createSkillWithLocalAgent(
  settings: SkillsLabSettings,
  prompt: string,
) {
  const response = await fetch('/api/skills/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, prompt }),
  })
  const payload = (await response.json().catch(() => null)) as
    | CreateSkillResponse
    | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '新建 Skill 失败')
  }
  return payload ?? {}
}

export async function openLocalSkillFolder(skillPath: string) {
  const response = await fetch('/api/skills/open-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillPath }),
  })
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '打开本地文件夹失败')
  }
}

export async function pickLocalSkillFolder() {
  const response = await fetch('/api/skills/pick-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const payload = (await response.json().catch(() => null)) as
    | { path?: string; error?: string }
    | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '选择本地文件夹失败')
  }
  return payload?.path
}

async function postSkillAgent(
  endpoint: string,
  body: {
    topic: SkillTopic
    settings: SkillsLabSettings
    message?: SkillLabMessage
    mode?: 'suggest' | 'test'
    prompt?: string
  },
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as SkillAgentResponse | null
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || '本地 agent 调用失败')
  }
  return payload ?? {}
}

async function postSkillAgentStream(
  endpoint: string,
  body: {
    topic: SkillTopic
    settings: SkillsLabSettings
    message?: SkillLabMessage
    mode?: 'suggest' | 'test'
    prompt?: string
  },
  onEvent: (event: SkillAgentStreamEvent) => void | Promise<void>,
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as
      | SkillAgentResponse
      | null
    throw new Error(payload?.error || '本地 agent 调用失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: SkillAgentResponse = {}
  let streamError: string | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = await flushStreamLines(buffer, onEvent)
    buffer = parsed.buffer
    if (parsed.result) result = parsed.result
    if (parsed.error) streamError = parsed.error
  }

  buffer += decoder.decode()
  const parsed = await flushStreamLines(`${buffer}\n`, onEvent)
  if (parsed.result) result = parsed.result
  if (parsed.error) streamError = parsed.error
  if (streamError) throw new Error(streamError)
  return result
}

async function flushStreamLines(
  buffer: string,
  onEvent: (event: SkillAgentStreamEvent) => void | Promise<void>,
) {
  let nextBuffer = buffer
  let result: SkillAgentResponse | undefined
  let error: string | undefined
  let lineEnd = nextBuffer.indexOf('\n')
  while (lineEnd >= 0) {
    const line = nextBuffer.slice(0, lineEnd).trim()
    nextBuffer = nextBuffer.slice(lineEnd + 1)
    if (line) {
      const event = JSON.parse(line) as SkillAgentStreamEvent
      await onEvent(event)
      if (event.type === 'result') result = event.result
      if (event.type === 'error') error = event.error
    }
    lineEnd = nextBuffer.indexOf('\n')
  }
  return { buffer: nextBuffer, error, result }
}

export function getSkillAgentToolLabel(tool: SkillAgentTool) {
  if (tool === 'claude-code') return 'Claude Code'
  if (tool === 'openclaw') return 'OpenClaw'
  if (tool === 'mock') return 'Mock'
  return 'Codex'
}
