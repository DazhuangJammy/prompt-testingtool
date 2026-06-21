import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const CODEX_TIMEOUT_MS = 120_000

export async function runCodexForJson(options) {
  const text = await runCodexForText(options)
  return parseJsonFromText(text)
}

export async function runCodexForText({
  cwd,
  settings,
  prompt,
  agentSessionId,
  abortSignal,
  onEvent,
}) {
  const tempDir = mkdtempSync(join(tmpdir(), 'skills-lab-'))
  const outputFile = join(tempDir, 'codex-output.txt')
  const command = settings?.toolCommand?.trim() || 'codex'
  const args = buildCodexArgs({
    agentSessionId,
    cwd,
    outputFile,
    prompt,
    settings,
    stream: Boolean(onEvent),
  })

  try {
    if (onEvent) {
      await spawnCodexStreaming(command, args, onEvent, CODEX_TIMEOUT_MS, abortSignal)
    } else {
      await spawnWithTimeout(command, args, CODEX_TIMEOUT_MS, abortSignal)
    }
    return readFileSync(outputFile, 'utf8').trim()
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function buildCodexArgs({
  agentSessionId,
  cwd,
  outputFile,
  prompt,
  settings,
  stream,
}) {
  const args = [
    '--ask-for-approval',
    'never',
    '--sandbox',
    settings?.permissionMode === 'allow-write' ? 'workspace-write' : 'read-only',
    'exec',
  ]

  if (agentSessionId) {
    args.push(
      'resume',
      ...(stream ? ['--json'] : []),
      '--skip-git-repo-check',
      '--output-last-message',
      outputFile,
      agentSessionId,
      prompt,
    )
    return args
  }

  args.push(
    ...(stream ? ['--json'] : []),
    '--skip-git-repo-check',
    '--output-last-message',
    outputFile,
    '-C',
    cwd,
    prompt,
  )
  return args
}

function spawnCodexStreaming(command, args, onEvent, timeoutMs, abortSignal) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdoutBuffer = ''
    let settled = false
    const emit = (event) => {
      Promise.resolve(onEvent(event)).catch(() => undefined)
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Codex 调用超时'))
    }, timeoutMs)
    const abort = () => {
      child.kill('SIGTERM')
      reject(new Error('Codex 调用已取消'))
    }
    abortSignal?.addEventListener('abort', abort, { once: true })

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString()
      stdoutBuffer = flushStdoutLines(stdoutBuffer, emit)
    })
    child.stderr.on('data', (chunk) => {
      emit({
        type: 'output',
        stream: 'stderr',
        text: chunk.toString(),
      })
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', abort)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', abort)
      if (stdoutBuffer.trim()) processCodexJsonLine(stdoutBuffer, emit)
      if (settled) return
      settled = true
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Codex exited with ${code}`))
    })
  })
}

function flushStdoutLines(buffer, emit) {
  let nextBuffer = buffer
  let lineEnd = nextBuffer.indexOf('\n')
  while (lineEnd >= 0) {
    const line = nextBuffer.slice(0, lineEnd)
    nextBuffer = nextBuffer.slice(lineEnd + 1)
    processCodexJsonLine(line, emit)
    lineEnd = nextBuffer.indexOf('\n')
  }
  return nextBuffer
}

function processCodexJsonLine(line, emit) {
  if (!line.trim()) return
  try {
    const event = JSON.parse(line)
    const text = formatCodexEvent(event)
    if (event.type === 'thread.started' && event.thread_id) {
      emit({ type: 'session', sessionId: event.thread_id })
    }
    if (text) emit({ type: 'output', stream: 'stdout', text })
  } catch {
    emit({ type: 'output', stream: 'stdout', text: `${line}\n` })
  }
}

function formatCodexEvent(event) {
  if (event.type === 'thread.started' && event.thread_id) {
    return `Codex session: ${event.thread_id}\n`
  }
  if (event.type === 'turn.started') return 'Codex started.\n'
  if (event.type === 'turn.completed') {
    const usage = event.usage
    const tokens = usage?.input_tokens || usage?.output_tokens
      ? ` input=${usage.input_tokens ?? 0} output=${usage.output_tokens ?? 0}`
      : ''
    return `Codex completed.${tokens}\n`
  }
  if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
    return `${event.item.text ?? ''}\n`
  }
  return ''
}

function spawnWithTimeout(command, args, timeoutMs, abortSignal) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Codex 调用超时'))
    }, timeoutMs)
    const abort = () => {
      child.kill('SIGTERM')
      reject(new Error('Codex 调用已取消'))
    }
    abortSignal?.addEventListener('abort', abort, { once: true })

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', abort)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', abort)
      if (code === 0) {
        resolve()
        return
      }
      const message = stderr.trim() || stdout.trim() || `Codex exited with ${code}`
      reject(new Error(message.slice(0, 1200)))
    })
  })
}

function parseJsonFromText(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  const candidate = fenced ?? trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Codex 未返回 JSON')
  return JSON.parse(candidate.slice(start, end + 1))
}
