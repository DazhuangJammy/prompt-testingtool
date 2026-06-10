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

try {
  ensureTooling()
  if (!existsSync(join(root, 'node_modules'))) {
    run('pnpm', ['install'])
  }
  await stopProductionServer()
  await ensurePortFree(webPort, 'Web')
  await ensurePortFree(apiPort, 'API')

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
  const openTimer = setInterval(async () => {
    if (opened) return
    if (await isPortOpen(host, webPort)) {
      opened = true
      clearInterval(openTimer)
      console.log('')
      console.log('Prompt Canvas dev is ready:')
      console.log(`  http://localhost:${webPort}`)
      console.log('')
      openBrowser(`http://localhost:${webPort}`)
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

async function ensurePortFree(port, label) {
  if (await isPortOpen(host, port)) {
    throw new Error(`${label} port ${port} is already in use on ${host}.`)
  }
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

function openBrowser(url) {
  const commands = {
    darwin: ['open', [url]],
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
