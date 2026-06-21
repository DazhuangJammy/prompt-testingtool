import {
  getSkillFileStatus,
  listLocalSkillDirectories,
} from '../services/skillGraphFallbackService.mjs'
import {
  analyzeSkill,
  askAboutSkill,
  createSkillWithAgent,
  runSkillTask,
} from '../services/skillAgentService.mjs'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { spawn } from 'node:child_process'

export async function listSkills(req, res) {
  try {
    res.json({ skills: listLocalSkillDirectories(req.body?.directory) })
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function analyzeSkillTopic(req, res) {
  try {
    res.json(await analyzeSkill(req.body ?? {}))
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function streamAnalyzeSkillTopic(req, res) {
  streamSkillAgentRun(req, res, (body) => analyzeSkill(body))
}

export async function askSkillQuestion(req, res) {
  try {
    res.json(await askAboutSkill(req.body ?? {}))
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function streamAskSkillQuestion(req, res) {
  streamSkillAgentRun(req, res, (body) => askAboutSkill(body))
}

export async function runSkillLabTask(req, res) {
  try {
    res.json(await runSkillTask(req.body ?? {}))
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function streamSkillLabTask(req, res) {
  streamSkillAgentRun(req, res, (body) => runSkillTask(body))
}

export async function createSkill(req, res) {
  try {
    res.json(await createSkillWithAgent(req.body ?? {}))
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function getSkillStatus(req, res) {
  try {
    res.json(getSkillFileStatus(req.body?.skillPath))
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function openSkillFolder(req, res) {
  try {
    const skillPath = req.body?.skillPath
    if (!skillPath || typeof skillPath !== 'string') {
      throw new Error('缺少本地 Skill 文件夹路径')
    }
    if (!existsSync(skillPath)) throw new Error('本地 Skill 文件夹不存在')
    await openFolder(skillPath)
    res.json({ ok: true })
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

export async function pickSkillFolder(_req, res) {
  try {
    const selectedPath = await pickFolder()
    res.json({ path: selectedPath })
  } catch (error) {
    res.status(400).json({ error: toErrorMessage(error) })
  }
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : '请求失败'
}

async function streamSkillAgentRun(req, res, run) {
  const abortController = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort()
  })
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  let agentSessionId = req.body?.topic?.agentSessionId

  const writeEvent = (event) => {
    if (res.writableEnded || res.destroyed) return
    if (event?.type === 'session' && event.sessionId) {
      agentSessionId = event.sessionId
    }
    res.write(`${JSON.stringify(event)}\n`)
  }

  try {
    const result = await run({
      ...(req.body ?? {}),
      topic: {
        ...(req.body?.topic ?? {}),
        abortSignal: abortController.signal,
        onEvent: writeEvent,
      },
    })
    writeEvent({ type: 'result', result: { ...result, agentSessionId } })
    res.end()
  } catch (error) {
    writeEvent({ type: 'error', error: toErrorMessage(error) })
    res.end()
  }
}

function openFolder(path) {
  const command =
    platform() === 'darwin'
      ? 'open'
      : platform() === 'win32'
        ? 'explorer'
        : 'xdg-open'

  return new Promise((resolve, reject) => {
    const child = spawn(command, [path], {
      detached: true,
      stdio: 'ignore',
    })
    child.on('error', reject)
    child.on('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

function pickFolder() {
  if (platform() !== 'darwin') {
    throw new Error('当前系统暂不支持弹出文件夹选择器，请手动输入路径。')
  }

  return new Promise((resolve, reject) => {
    const script =
      'POSIX path of (choose folder with prompt "选择本地 Skill 文件夹")'
    const child = spawn('osascript', ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      const selectedPath = stdout.trim()
      if (code === 0 && selectedPath) {
        resolve(selectedPath)
        return
      }
      const message = stderr.trim()
      if (message.includes('User canceled')) {
        reject(new Error('已取消选择文件夹'))
        return
      }
      reject(new Error(message || '选择文件夹失败'))
    })
  })
}
