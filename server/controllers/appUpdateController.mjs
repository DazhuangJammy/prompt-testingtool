import {
  checkUpdateStatus,
  updateApplication,
} from '../services/appUpdateService.mjs'

export const getAppUpdateStatus = async (_req, res) => {
  try {
    res.json(await checkUpdateStatus())
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Update check failed',
    })
  }
}

export const runAppUpdate = async (_req, res) => {
  try {
    res.json(await updateApplication())
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Update failed',
    })
  }
}
