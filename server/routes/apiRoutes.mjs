import { Router } from 'express'
import {
  createEmbeddings,
  listProviderModels,
  proxyChatCompletion,
  rerankDocuments,
  testProvider,
} from '../controllers/chatController.mjs'
import {
  getAppUpdateStatus,
  runAppUpdate,
} from '../controllers/appUpdateController.mjs'
import {
  connectBailianBase,
  deleteBailianBaseDocuments,
  listBailianBaseDocuments,
  parseBailianUpload,
  retrieveFromBailianBase,
  uploadBailianBaseDocuments,
} from '../controllers/bailianKnowledgeController.mjs'
import { extractDocumentTextController } from '../controllers/documentController.mjs'
import { fetchKnowledgeUrl } from '../controllers/knowledgeController.mjs'
import {
  analyzeSkillTopic,
  askSkillQuestion,
  createSkill,
  getSkillStatus,
  listSkills,
  openSkillFolder,
  pickSkillFolder,
  runSkillLabTask,
  streamAnalyzeSkillTopic,
  streamAskSkillQuestion,
  streamSkillLabTask,
} from '../controllers/skillsController.mjs'
import {
  checkWebSearchProvider,
  runWebSearch,
} from '../controllers/webSearchController.mjs'

export const apiRoutes = Router()

apiRoutes.post('/chat/completions', proxyChatCompletion)
apiRoutes.post('/embeddings', createEmbeddings)
apiRoutes.post('/rerank', rerankDocuments)
apiRoutes.post('/test-provider', testProvider)
apiRoutes.post('/provider-models', listProviderModels)
apiRoutes.post('/documents/extract-text', extractDocumentTextController)
apiRoutes.post('/knowledge/fetch-url', fetchKnowledgeUrl)
apiRoutes.post('/knowledge/bailian/connect', connectBailianBase)
apiRoutes.post('/knowledge/bailian/documents', listBailianBaseDocuments)
apiRoutes.post(
  '/knowledge/bailian/documents/upload',
  parseBailianUpload,
  uploadBailianBaseDocuments,
)
apiRoutes.post('/knowledge/bailian/documents/delete', deleteBailianBaseDocuments)
apiRoutes.post('/knowledge/bailian/retrieve', retrieveFromBailianBase)
apiRoutes.post('/web-search/search', runWebSearch)
apiRoutes.post('/web-search/check', checkWebSearchProvider)
apiRoutes.get('/app/update-status', getAppUpdateStatus)
apiRoutes.post('/app/update', runAppUpdate)
apiRoutes.post('/skills/list', listSkills)
apiRoutes.post('/skills/analyze', analyzeSkillTopic)
apiRoutes.post('/skills/analyze/stream', streamAnalyzeSkillTopic)
apiRoutes.post('/skills/ask', askSkillQuestion)
apiRoutes.post('/skills/ask/stream', streamAskSkillQuestion)
apiRoutes.post('/skills/task', runSkillLabTask)
apiRoutes.post('/skills/task/stream', streamSkillLabTask)
apiRoutes.post('/skills/status', getSkillStatus)
apiRoutes.post('/skills/create', createSkill)
apiRoutes.post('/skills/open-folder', openSkillFolder)
apiRoutes.post('/skills/pick-folder', pickSkillFolder)
