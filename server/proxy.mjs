import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiRoutes } from './routes/apiRoutes.mjs'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'
const root = join(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')

export function createProxyApp({ staticRoot = dist } = {}) {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '12mb' }))
  app.use('/api', apiRoutes)

  if (existsSync(staticRoot)) {
    app.use(express.static(staticRoot))
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        next()
        return
      }
      res.sendFile(join(staticRoot, 'index.html'))
    })
  }

  return app
}

export function startProxyServer(options = {}) {
  const targetHost = options.host ?? host
  const targetPort = options.port ?? port
  const app = createProxyApp({ staticRoot: options.staticRoot })

  return new Promise((resolveServer, reject) => {
    const server = app.listen(targetPort, targetHost, () => {
      const address = server.address()
      const actualPort =
        address && typeof address === 'object' ? address.port : targetPort
      resolveServer({
        app,
        server,
        host: targetHost,
        port: actualPort,
        url: `http://${targetHost}:${actualPort}`,
      })
    })

    server.once('error', reject)
  })
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  try {
    const server = await startProxyServer()
    console.log(`Prompt proxy listening on ${server.url}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
