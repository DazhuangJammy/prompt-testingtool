export interface AppUpdateStatus {
  ok: boolean
  version: string
  branch: string
  currentCommit: string
  remoteCommit: string
  hasUpdate: boolean
  releaseUrl: string
  error?: string
}

export interface AppUpdateResult {
  ok: boolean
  branch: string
  before: string
  after: string
  updated: boolean
  message: string
  error?: string
}

export async function checkAppUpdate(): Promise<AppUpdateStatus> {
  const response = await fetch('/api/app/update-status')
  const payload = (await response.json()) as AppUpdateStatus
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || '检查更新失败')
  }
  return payload
}

export async function runAppUpdate(): Promise<AppUpdateResult> {
  const response = await fetch('/api/app/update', { method: 'POST' })
  const payload = (await response.json()) as AppUpdateResult
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || '更新失败')
  }
  return payload
}
