import { Router } from 'express'
import {
  proxyChatCompletion,
  testProvider,
} from '../controllers/chatController.mjs'

export const apiRoutes = Router()

apiRoutes.post('/chat/completions', proxyChatCompletion)
apiRoutes.post('/test-provider', testProvider)
