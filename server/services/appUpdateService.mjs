import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = join(fileURLToPath(new URL('../..', import.meta.url)))
const timeout = 120_000
const releaseUrl = 'https://github.com/DazhuangJammy/prompt-testingtool/releases'

export async function checkUpdateStatus() {
  const [version, branch, currentCommit, remoteCommit] = await Promise.all([
    readPackageVersion(),
    git(['branch', '--show-current']).catch(() => ''),
    git(['rev-parse', 'HEAD']).catch(() => ''),
    getRemoteCommit(),
  ])

  return {
    ok: true,
    version,
    branch: branch || 'main',
    currentCommit,
    remoteCommit,
    hasUpdate: Boolean(currentCommit && remoteCommit && currentCommit !== remoteCommit),
    releaseUrl,
  }
}

export async function updateApplication() {
  const before = await git(['rev-parse', 'HEAD']).catch(() => '')
  const branch = (await git(['branch', '--show-current']).catch(() => 'main')) || 'main'

  await git(['fetch', 'origin', branch])
  await git(['pull', '--ff-only', 'origin', branch])
  await run('pnpm', ['install', '--frozen-lockfile'])
  await run('pnpm', ['build'])

  const after = await git(['rev-parse', 'HEAD']).catch(() => '')
  scheduleRestart()

  return {
    ok: true,
    branch,
    before,
    after,
    updated: Boolean(before && after && before !== after),
    message: '更新完成，服务正在重启',
  }
}

async function getRemoteCommit() {
  const branch = (await git(['branch', '--show-current']).catch(() => 'main')) || 'main'
  const output = await git(['ls-remote', 'origin', `refs/heads/${branch}`]).catch(
    () => '',
  )
  return output.split(/\s+/)[0] ?? ''
}

async function readPackageVersion() {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  return String(pkg.version ?? '0.0.0')
}

function git(args) {
  return run('git', args)
}

async function run(command, args) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: root,
    timeout,
    windowsHide: true,
  })
  return stdout.trim()
}

function scheduleRestart() {
  setTimeout(() => {
    const child = execFile(
      process.execPath,
      [
        'scripts/prompt-tool.mjs',
        'restart',
        '--host',
        process.env.HOST ?? '127.0.0.1',
        '--port',
        process.env.PORT ?? '8787',
      ],
      {
        cwd: root,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      },
    )
    child.unref()
  }, 250)
}
