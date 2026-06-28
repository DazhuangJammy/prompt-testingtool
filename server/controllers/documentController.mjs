import { extractDocumentText } from '../services/documentExtractionService.mjs'

export const extractDocumentTextController = async (req, res) => {
  try {
    res.json({
      text: await extractDocumentText(req.body ?? {}),
    })
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : '文档解析失败',
    })
  }
}
