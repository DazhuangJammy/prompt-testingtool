import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import pkg from '../../../../package.json'
import { checkAppUpdate, runAppUpdate } from '@/shared/api/appUpdate'
import { AppVersionBadge } from './AppVersionBadge'

vi.mock('@/shared/api/appUpdate', () => ({
  checkAppUpdate: vi.fn(),
  runAppUpdate: vi.fn(),
}))

let root: Root | undefined
let host: HTMLDivElement | undefined

function renderBadge() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(<AppVersionBadge />)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('AppVersionBadge', () => {
  it('shows local version while checking and links to releases', () => {
    vi.mocked(checkAppUpdate).mockResolvedValue({
      ok: true,
      version: '0.0.1',
      branch: 'main',
      currentCommit: 'a',
      remoteCommit: 'a',
      hasUpdate: false,
      releaseUrl: 'https://github.com/DazhuangJammy/prompt-testingtool/releases',
    })
    vi.mocked(runAppUpdate).mockResolvedValue({
      ok: true,
      branch: 'main',
      before: 'a',
      after: 'a',
      updated: false,
      message: '已经是最新版本',
    })

    renderBadge()

    expect(document.querySelector('.version-badge')?.textContent).toContain(
      `v${pkg.version}`,
    )

    act(() => {
      document
        .querySelector<HTMLButtonElement>('.version-badge')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const link = document.querySelector<HTMLAnchorElement>('.version-actions a')

    expect(link?.getAttribute('href')).toBe(
      'https://github.com/DazhuangJammy/prompt-testingtool/releases',
    )
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('checks updates on mount and shows an update dot', async () => {
    vi.mocked(checkAppUpdate).mockResolvedValue({
      ok: true,
      version: '0.0.1',
      branch: 'main',
      currentCommit: 'a',
      remoteCommit: 'b',
      hasUpdate: true,
      releaseUrl: 'https://github.com/DazhuangJammy/prompt-testingtool/releases',
    })

    renderBadge()

    await act(async () => {
      await Promise.resolve()
    })

    expect(checkAppUpdate).toHaveBeenCalled()
    expect(document.querySelector('.version-update-dot')).toBeTruthy()
  })
})
