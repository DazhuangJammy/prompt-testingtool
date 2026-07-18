import multer from 'multer'
import {
  connectBailianKnowledgeBase,
  deleteBailianDocuments,
  listBailianDocuments,
  retrieveBailianKnowledge,
  uploadBailianDocuments,
} from '../services/bailianKnowledgeService.mjs'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
})

export function parseBailianUpload(req, res, next) {
  upload.array('files', 10)(req, res, (error) => {
    if (!error) {
      next()
      return
    }
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? '单个文件不能超过 100MB'
      : error.message || '文件上传失败'
    res.status(400).json({ error: message })
  })
}

export async function connectBailianBase(req, res) {
  await respond(res, () => connectBailianKnowledgeBase(req.body ?? {}))
}

export async function listBailianBaseDocuments(req, res) {
  const { connection, knowledgeBaseId } = req.body ?? {}
  await respond(res, () => listBailianDocuments(connection, knowledgeBaseId))
}

export async function uploadBailianBaseDocuments(req, res) {
  await respond(res, () => uploadBailianDocuments(
    parseJsonField(req.body?.connection),
    req.body?.knowledgeBaseId,
    req.files,
  ))
}

export async function deleteBailianBaseDocuments(req, res) {
  const { connection, documentIds, knowledgeBaseId } = req.body ?? {}
  await respond(res, () => deleteBailianDocuments(
    connection,
    knowledgeBaseId,
    documentIds,
  ))
}

export async function retrieveFromBailianBase(req, res) {
  await respond(res, () => retrieveBailianKnowledge(req.body ?? {}))
}

async function respond(res, task) {
  try {
    res.json(await task())
  } catch (error) {
    const message = error instanceof Error ? error.message : '百炼请求失败'
    const status = /^请(填写|选择)/.test(message) ? 400 : 502
    res.status(status).json({ error: message })
  }
}

function parseJsonField(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
