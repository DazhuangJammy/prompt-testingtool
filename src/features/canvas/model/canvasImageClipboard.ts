export interface ClipboardImageData {
  dataUrl: string
  mimeType: string
  name: string
  naturalHeight?: number
  naturalWidth?: number
}

export function getClipboardImageFiles(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return []
  return Array.from(dataTransfer.files).filter((file) =>
    file.type.startsWith('image/'),
  )
}

export async function readClipboardImage(file: File): Promise<ClipboardImageData> {
  const dataUrl = await readFileAsDataUrl(file)
  const size = await readImageSize(dataUrl)

  return {
    dataUrl,
    mimeType: file.type || 'image/png',
    name: file.name || '粘贴图片.png',
    naturalHeight: size.height,
    naturalWidth: size.width,
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('无法读取图片'))
    })
    reader.addEventListener('error', () => reject(new Error('无法读取图片')))
    reader.readAsDataURL(file)
  })
}

function readImageSize(src: string) {
  return new Promise<{ height?: number; width?: number }>((resolve) => {
    const image = new Image()
    image.addEventListener('load', () =>
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth,
      }),
    )
    image.addEventListener('error', () => resolve({}))
    image.src = src
  })
}
