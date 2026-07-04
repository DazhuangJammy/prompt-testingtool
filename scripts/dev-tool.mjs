#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const host = process.env.PROMPT_TOOL_HOST ?? '127.0.0.1'
const webPort = Number(process.env.PROMPT_TOOL_WEB_PORT ?? 5173)
const apiPort = Number(process.env.PROMPT_TOOL_API_PORT ?? 8787)
const webUrl = process.env.PROMPT_TOOL_WEB_URL ?? `http://localhost:${webPort}`
const shouldOpenBrowser = !process.argv.slice(2).includes('--no-open')

try {
  ensureTooling()
  if (!existsSync(join(root, 'node_modules'))) {
    run('pnpm', ['install'])
  }
  await stopProductionServer()
  await freePort(webPort, 'Web')
  await freePort(apiPort, 'API')

  const api = spawn('pnpm', ['dev:api'], {
    cwd: root,
    env: { ...process.env, HOST: host, PORT: String(apiPort) },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  const web = spawn(
    'pnpm',
    ['dev:web', '--', '--host', host, '--port', String(webPort), '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, HOST: host, PORT: String(webPort) },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )

  let opened = false
  let checkingReady = false
  const openTimer = setInterval(async () => {
    if (opened || checkingReady) return
    checkingReady = true
    try {
      if (await isWebReady(webUrl)) {
        opened = true
        clearInterval(openTimer)
        console.log('')
        console.log('Prompt Canvas dev is ready:')
        console.log(`  ${webUrl}`)
        console.log('')
        if (shouldOpenBrowser) openBrowser(webUrl)
      }
    } finally {
      checkingReady = false
    }
  }, 250)

  const shutdown = () => {
    clearInterval(openTimer)
    api.kill()
    web.kill()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  api.on('exit', (code) => {
    if (code === 0 || code === null) return
    web.kill()
    process.exit(code)
  })
  web.on('exit', (code) => {
    if (code === 0 || code === null) return
    api.kill()
    process.exit(code)
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

function ensureTooling() {
  requireCommand('node', 'Install Node.js 20+ first: https://nodejs.org/')
  if (!commandExists('pnpm')) {
    if (commandExists('corepack')) {
      run('corepack', ['enable'])
      run('corepack', ['prepare', 'pnpm@10.0.0', '--activate'])
    }
  }
  requireCommand('pnpm', 'Install pnpm first.')
}

function requireCommand(command, help) {
  if (!commandExists(command)) throw new Error(`${command} is missing. ${help}`)
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })
  return result.status === 0
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.`)
}

async function stopProductionServer() {
  if (!existsSync(join(root, '.prompt-tool', 'server.pid'))) return
  const result = spawnSync(process.execPath, ['scripts/prompt-tool.mjs', 'stop'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error('Could not stop the production server before dev startup.')
  }
}

async function freePort(port, label) {
  const pids = findListeningPids(port)
  if (!pids.length) return

  console.log(`${label} port ${port} is in use. Stopping old process: ${pids.join(', ')}`)
  for (const pid of pids) {
    stopProcess(pid, 'SIGTERM')
  }

  const stopped = await waitForPortFree(port, 24, 125)
  if (stopped) return

  for (const pid of pids) {
    stopProcess(pid, 'SIGKILL')
  }
  if (!(await waitForPortFree(port, 16, 125))) {
    throw new Error(`Could not free ${label} port ${port} on ${host}.`)
  }
}

function findListeningPids(port) {
  if (process.platform === 'win32') return []
  const result = spawnSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  if (result.status !== 0 && !result.stdout) return []
  return [...new Set(
    result.stdout
      .split('\n')
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
  )]
}

function stopProcess(pid, signal) {
  try {
    process.kill(pid, signal)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') {
      throw error
    }
  }
}

async function waitForPortFree(port, attempts, delayMs) {
  for (let index = 0; index < attempts; index += 1) {
    if (!(await isPortOpen(host, port))) return true
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

function isPortOpen(targetHost, targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: targetHost, port: targetPort })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function isWebReady(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response.ok || response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function openBrowser(url) {
  const commands = {
    darwin: ['/usr/bin/open', [url]],
    linux: ['xdg-open', [url]],
    win32: ['cmd', ['/c', 'start', '', url]],
  }
  const command = commands[process.platform]
  if (!command) return
  spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).unref()
}
