import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiRoutes } from './routes/apiRoutes.mjs'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const root = join(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')

app.use(cors())
app.use(express.json({ limit: '12mb' }))
app.use('/api', apiRoutes)

if (existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(join(dist, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Prompt proxy listening on http://localhost:${port}`)
})
