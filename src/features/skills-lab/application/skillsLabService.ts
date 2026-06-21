import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import {
  createSkillWithLocalAgent,
  streamAnalyzeSkillWithLocalAgent,
  streamAskSkillAgent,
  streamSkillAgentTask,
  type SkillAgentStreamEvent,
} from '@/features/skills-lab/infrastructure/localSkillAgentClient'
import { createReorderedSkillTopicSortUpdates } from '@/features/skills-lab/model/skillTopic'
import type {
  SkillGraph,
  SkillLabMessage,
  SkillsLabSettings,
  SkillTopic,
} from '@/shared/types'

export async function createSkillTopic(skillPath?: string) {
  return skillsLabRepository.createTopic(undefined, skillPath)
}

export async function duplicateSkillTopic(topic: SkillTopic) {
  return skillsLabRepository.duplicateTopic(topic)
}

export async function deleteSkillTopic(topicId: string) {
  await skillsLabRepository.deleteTopicCascade(topicId)
}

export async function renameSkillTopic(topicId: string, title: string) {
  await skillsLabRepository.renameTopic(topicId, title)
}

export async function reorderSkillTopics(
  topics: SkillTopic[],
  draggedId: string,
  targetId: string,
) {
  await skillsLabRepository.updateTopicSortOrders(
    createReorderedSkillTopicSortUpdates(topics, draggedId, targetId),
  )
}

export async function bindSkillPath(topicId: string, skillPath: string) {
  await skillsLabRepository.bindSkillPath(topicId, skillPath)
}

export async function createSkillForTopic(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  prompt: string,
) {
  const result = await createSkillWithLocalAgent(settings, prompt)
  if (result.skillPath) {
    await skillsLabRepository.bindSkillPath(topic.id, result.skillPath)
  }
  await skillsLabRepository.addMessage({
    topicId: topic.id,
    role: 'assistant',
    kind: 'suggestion',
    content: result.answer || 'Skill 创建完成。',
    status: 'complete',
  })
  return result.skillPath
}

export async function removeSkillBinding(topicId: string) {
  await skillsLabRepository.removeSkillBinding(topicId)
}

export async function analyzeSkillTopic(
  topic: SkillTopic,
  settings: SkillsLabSettings,
) {
  if (!topic.skillPath) throw new Error('请先选择本地 Skill 文件夹')

  await skillsLabRepository.updateTopic(topic.id, {
    status: 'analyzing',
    error: undefined,
  })

  let terminal: Awaited<ReturnType<typeof createTerminalSink>> | undefined
  try {
    terminal = await createTerminalSink(topic, 'analysis')
    const result = await streamAnalyzeSkillWithLocalAgent(topic, settings, terminal.handleEvent)
    await terminal.complete()
    if (!result.graph) throw new Error('本地 agent 没有返回 Skill 图谱')
    await skillsLabRepository.saveAnalysisWithTopicUpdates(
      topic.id,
      result.graph,
      result.fileSignature,
      {
        agentSessionId: result.agentSessionId ?? topic.agentSessionId,
      },
    )
    await skillsLabRepository.addMessage({
      topicId: topic.id,
      role: 'assistant',
      kind: 'analysis',
      content: result.graph.summary || '解读完成，画布已更新。',
      status: 'complete',
    })
    if (settings.autoRunChecks) {
      await runAutoSkillCheck(
        { ...topic, agentSessionId: result.agentSessionId ?? topic.agentSessionId },
        settings,
        result.graph,
      )
    }
    return result.graph
  } catch (error) {
    await terminal?.fail(error)
    const message = error instanceof Error ? error.message : '解读失败'
    await skillsLabRepository.updateTopic(topic.id, {
      status: 'error',
      error: message,
    })
    throw error
  }
}

export async function sendSkillLabMessage(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  kind: SkillLabMessage['kind'],
  content: string,
) {
  const text = content.trim()
  if (!text) return undefined

  const userMessage = await skillsLabRepository.addMessage({
    topicId: topic.id,
    role: 'user',
    kind,
    content: text,
    status: 'complete',
  })

  const terminal = await createTerminalSink(topic, kind)
  try {
    const response =
      kind === 'question'
        ? await streamAskSkillAgent(
            topic,
            settings,
            userMessage,
            terminal.handleEvent,
          )
        : await streamSkillAgentTask(
            topic,
            settings,
            kind === 'test' ? 'test' : 'suggest',
            text,
            terminal.handleEvent,
          )
    await terminal.complete()
    const answer = response.answer || '外部 agent 没有返回内容。'
    await skillsLabRepository.addMessage({
      topicId: topic.id,
      role: 'assistant',
      kind,
      content: answer,
      status: 'complete',
    })
    return answer
  } catch (error) {
    await terminal.fail(error)
    throw error
  }
}

async function runAutoSkillCheck(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  graph: SkillGraph,
) {
  let terminal: Awaited<ReturnType<typeof createTerminalSink>> | undefined
  try {
    terminal = await createTerminalSink(topic, 'test')
    const response = await streamSkillAgentTask(
      topic,
      { ...settings, permissionMode: 'read-only' },
      'test',
      buildAutoCheckPrompt(graph),
      terminal.handleEvent,
    )
    await terminal.complete()
    await skillsLabRepository.addMessage({
      topicId: topic.id,
      role: 'assistant',
      kind: 'test',
      content: `自动检查结果：\n${response.answer || '外部 agent 没有返回内容。'}`,
      status: 'complete',
    })
  } catch (error) {
    await terminal?.fail(error)
    await skillsLabRepository.addMessage({
      topicId: topic.id,
      role: 'assistant',
      kind: 'test',
      content: `自动检查失败：${error instanceof Error ? error.message : '未知错误'}`,
      status: 'error',
    })
  }
}

async function createTerminalSink(
  topic: SkillTopic,
  kind: SkillLabMessage['kind'],
) {
  const statusMessage = await skillsLabRepository.addMessage({
    topicId: topic.id,
    role: 'assistant',
    kind,
    content: 'Codex 启动中...',
    format: 'terminal',
    stream: 'stdout',
    agentSessionId: topic.agentSessionId,
    status: 'streaming',
  })
  let agentSessionId = topic.agentSessionId
  let hasError = false

  const addTerminalMessage = async (
    content: string,
    stream: 'stdout' | 'stderr',
    status: SkillLabMessage['status'] = 'complete',
  ) => {
    await skillsLabRepository.addMessage({
      topicId: topic.id,
      role: 'assistant',
      kind,
      content,
      format: 'terminal',
      stream,
      agentSessionId,
      status,
    })
  }

  const handleEvent = async (event: SkillAgentStreamEvent) => {
    if (event.type === 'session') {
      agentSessionId = event.sessionId
      await skillsLabRepository.updateTopic(topic.id, { agentSessionId })
      await skillsLabRepository.updateMessage(statusMessage.id, { agentSessionId })
      return
    }

    if (event.type === 'output') {
      for (const block of splitTerminalBlocks(event.text)) {
        await addTerminalMessage(block, event.stream)
      }
      return
    }

    if (event.type === 'error') {
      hasError = true
      await addTerminalMessage(`ERROR: ${event.error}`, 'stderr', 'error')
    }
  }

  const complete = async () => {
    await skillsLabRepository.updateMessage(statusMessage.id, {
      agentSessionId,
      status: 'complete',
    })
  }

  const fail = async (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    if (!hasError) {
      await addTerminalMessage(`ERROR: ${errorMessage}`, 'stderr', 'error')
    }
    await skillsLabRepository.updateMessage(statusMessage.id, {
      agentSessionId,
      status: 'error',
    })
  }

  return { complete, fail, handleEvent }
}

function splitTerminalBlocks(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function buildAutoCheckPrompt(graph: SkillGraph) {
  const suggestions = graph.testSuggestions.length
    ? graph.testSuggestions.map((item) => `- ${item}`).join('\n')
    : '- 检查 SKILL.md 的触发条件是否清楚。\n- 检查引用文件是否能被正确读取。'

  return `请对刚解读的 skill 做一次只读自动检查，不要修改文件。\n\n图谱摘要：${graph.summary}\n\n优先检查：\n${suggestions}\n\n输出测试动作、结果、失败原因和对应节点。`
}
