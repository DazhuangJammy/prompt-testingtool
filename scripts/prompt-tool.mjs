#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stateDir = join(root, '.prompt-tool')
const logsDir = join(root, 'logs')
const pidFile = join(stateDir, 'server.pid')
const defaultPort = Number(process.env.PROMPT_TOOL_PORT ?? process.env.PORT ?? 8787)

const { action, options } = parseArgs(process.argv.slice(2))
const port = Number(options.port ?? defaultPort)
const host = String(
  options.host ?? process.env.PROMPT_TOOL_HOST ?? process.env.HOST ?? '127.0.0.1',
)

try {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${String(options.port ?? defaultPort)}`)
  }

  if (action === 'stop') {
    await stopServer()
  } else if (action === 'status') {
    showStatus(host, port)
  } else if (action === 'restart') {
    await stopServer({ quiet: true })
    await startServer()
  } else if (action === 'start') {
    await startServer()
  } else {
    printUsage()
    process.exit(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

async function startServer() {
  ensureTooling()
  if (options.install || !existsSync(join(root, 'node_modules'))) {
    installDependencies()
  }
  if (options.build || !existsSync(join(root, 'dist', 'index.html'))) {
    buildApp()
  }

  const runningPid = readRunningPid()
  if (runningPid) {
    console.log(`Prompt Canvas is already running. PID: ${runningPid}`)
    printAccess(host, port)
    return
  }

  if (!(await isPortFree(host, port))) {
    throw new Error(`Port ${port} is already in use on ${host}.`)
  }

  mkdirSync(stateDir, { recursive: true })
  mkdirSync(logsDir, { recursive: true })

  const output = openSync(join(logsDir, 'server.log'), 'a')
  const errors = openSync(join(logsDir, 'server.error.log'), 'a')
  const child = spawn(process.execPath, ['server/proxy.mjs'], {
    cwd: root,
    detached: true,
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', output, errors],
  })
  closeSync(output)
  closeSync(errors)

  child.unref()
  writeFileSync(pidFile, String(child.pid))

  await waitForServer(port)
  console.log(`Prompt Canvas started. PID: ${child.pid}`)
  printAccess(host, port)

  if (options.open) {
    openBrowser(`http://127.0.0.1:${port}`)
  }
}

async function stopServer({ quiet = false } = {}) {
  const pid = readPid()
  if (!pid) {
    if (!quiet) console.log('Prompt Canvas is not running.')
    return
  }

  if (!isProcessAlive(pid)) {
    rmSync(pidFile, { force: true })
    if (!quiet) console.log('Removed stale PID file.')
    return
  }

  process.kill(pid)
  await waitUntilStopped(pid)
  rmSync(pidFile, { force: true })
  if (!quiet) console.log('Prompt Canvas stopped.')
}

function showStatus(targetHost, targetPort) {
  const pid = readRunningPid()
  if (!pid) {
    console.log('Prompt Canvas is stopped.')
    return
  }
  console.log(`Prompt Canvas is running. PID: ${pid}`)
  printAccess(targetHost, targetPort)
}

function ensureTooling() {
  requireCommand('node', 'Install Node.js 20+ first: https://nodejs.org/')
  if (commandExists('pnpm')) return

  if (commandExists('corepack')) {
    run('corepack', ['enable'])
    run('corepack', ['prepare', 'pnpm@10.0.0', '--activate'])
  }

  if (!commandExists('pnpm')) {
    if (!commandExists('npm')) {
      throw new Error('pnpm is missing, and npm is unavailable to install it.')
    }
    run('npm', ['install', '-g', 'pnpm'])
  }
}

function installDependencies() {
  console.log('Installing dependencies...')
  const args = existsSync(join(root, 'pnpm-lock.yaml'))
    ? ['install', '--frozen-lockfile']
    : ['install']
  run('pnpm', args)
}

function buildApp() {
  console.log('Building Prompt Canvas...')
  run('pnpm', ['build'])
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`)
  }
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

function readPid() {
  if (!existsSync(pidFile)) return undefined
  const pid = Number(readFileSync(pidFile, 'utf8').trim())
  return Number.isInteger(pid) && pid > 0 ? pid : undefined
}

function readRunningPid() {
  const pid = readPid()
  return pid && isProcessAlive(pid) ? pid : undefined
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

function isPortFree(targetHost, targetPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen({ host: targetHost, port: targetPort }, () => {
      server.close(() => resolve(true))
    })
  })
}

function waitForServer(targetPort) {
  const url = `http://127.0.0.1:${targetPort}`
  return retry(async () => {
    const response = await fetch(url)
    if (!response.ok && response.status >= 500) {
      throw new Error(`Server returned ${response.status}`)
    }
  }, `Server did not start. Check ${join(logsDir, 'server.error.log')}`)
}

async function waitUntilStopped(pid) {
  await retry(async () => {
    if (isProcessAlive(pid)) throw new Error('still running')
  }, `Could not stop process ${pid}.`, 25, 120)
}

async function retry(task, failureMessage, attempts = 40, delayMs = 150) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      await task()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(failureMessage)
}

function printAccess(targetHost, targetPort) {
  console.log('')
  console.log('Open in browser:')
  for (const url of accessUrls(targetHost, targetPort)) {
    console.log(`  ${url}`)
  }
  console.log('')
}

function accessUrls(targetHost, targetPort) {
  if (targetHost === '0.0.0.0' || targetHost === '::') {
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((item) => item && item.family === 'IPv4' && !item.internal)
      .map((item) => item.address)
    return [`http://127.0.0.1:${targetPort}`, ...ips.map((ip) => `http://${ip}:${targetPort}`)]
  }
  return [`http://${targetHost}:${targetPort}`]
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

function parseArgs(argv) {
  const parsed = { action: 'start', options: {} }
  let actionSet = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--') && !actionSet) {
      parsed.action = arg
      actionSet = true
      continue
    }

    if (arg === '--install') parsed.options.install = true
    else if (arg === '--build') parsed.options.build = true
    else if (arg === '--open') parsed.options.open = true
    else if (arg === '--no-open') parsed.options.open = false
    else if (arg.startsWith('--host=')) parsed.options.host = arg.slice(7)
    else if (arg === '--host') parsed.options.host = argv[++index]
    else if (arg.startsWith('--port=')) parsed.options.port = arg.slice(7)
    else if (arg === '--port') parsed.options.port = argv[++index]
    else if (arg === '--help' || arg === '-h') parsed.action = 'help'
  }

  return parsed
}

function printUsage() {
  console.log(`Usage:
  node scripts/prompt-tool.mjs start [--host 127.0.0.1] [--port 8787] [--install] [--build] [--open]
  node scripts/prompt-tool.mjs restart [--host 0.0.0.0] [--port 8787] [--install] [--build]
  node scripts/prompt-tool.mjs stop
  node scripts/prompt-tool.mjs status`)
}
