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

export const apiRoutes = Router()

apiRoutes.post('/chat/completions', proxyChatCompletion)
apiRoutes.post('/embeddings', createEmbeddings)
apiRoutes.post('/rerank', rerankDocuments)
apiRoutes.post('/test-provider', testProvider)
apiRoutes.post('/provider-models', listProviderModels)
apiRoutes.post('/knowledge/fetch-url', fetchKnowledgeUrl)
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
