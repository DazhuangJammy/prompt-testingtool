import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAppUpdate, runAppUpdate } from './appUpdate'

describe('app update api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('checks app update status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          version: '0.1.0',
          branch: 'main',
          currentCommit: 'a',
          remoteCommit: 'b',
          hasUpdate: true,
          releaseUrl: 'https://github.com/DazhuangJammy/prompt-testingtool/releases',
        }),
      ),
    )

    await expect(checkAppUpdate()).resolves.toMatchObject({
      version: '0.1.0',
      hasUpdate: true,
    })
    expect(fetch).toHaveBeenCalledWith('/api/app/update-status')
  })

  it('runs app updates through the local API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          branch: 'main',
          before: 'a',
          after: 'b',
          updated: true,
          message: '更新完成',
        }),
      ),
    )

    await expect(runAppUpdate()).resolves.toMatchObject({
      updated: true,
      message: '更新完成',
    })
    expect(fetch).toHaveBeenCalledWith('/api/app/update', { method: 'POST' })
  })

  it('throws update errors from the local API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'bad' }), {
        status: 500,
      }),
    )

    await expect(checkAppUpdate()).rejects.toThrow('bad')
  })

  it('throws run update errors from the local API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'update bad' }), {
        status: 500,
      }),
    )

    await expect(runAppUpdate()).rejects.toThrow('update bad')
  })
})
