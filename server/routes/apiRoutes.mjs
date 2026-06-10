import { Router } from 'express'
import {
  proxyChatCompletion,
  testProvider,
} from '../controllers/chatController.mjs'
import {
  getAppUpdateStatus,
  runAppUpdate,
} from '../controllers/appUpdateController.mjs'

export const apiRoutes = Router()

apiRoutes.post('/chat/completions', proxyChatCompletion)
apiRoutes.post('/test-provider', testProvider)
apiRoutes.get('/app/update-status', getAppUpdateStatus)
apiRoutes.post('/app/update', runAppUpdate)
