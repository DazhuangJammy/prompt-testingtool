import { app, BrowserWindow, shell } from 'electron'
import { startProxyServer } from '../server/proxy.mjs'

const desktopHost = '127.0.0.1'
let mainWindow
let proxyServer

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

async function createWindow() {
  if (!proxyServer) {
    proxyServer = await startProxyServer({
      host: desktopHost,
      port: 0,
    })
    process.env.HOST = proxyServer.host
    process.env.PORT = String(proxyServer.port)
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Prompt Canvas Tool',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(proxyServer.url)) return
    event.preventDefault()
    shell.openExternal(url)
  })

  await mainWindow.loadURL(proxyServer.url)
}

app.whenReady().then(async () => {
  try {
    await createWindow()
  } catch (error) {
    console.error(error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  proxyServer?.server.close()
})
