import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getClipboardImageFiles,
  readClipboardImage,
} from './canvasImageClipboard'

class MockFileReader extends EventTarget {
  result: string | ArrayBuffer | null = null

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,abc`
    this.dispatchEvent(new Event('load'))
  }
}

class MockImage extends EventTarget {
  naturalHeight = 80
  naturalWidth = 120

  set src(_value: string) {
    this.dispatchEvent(new Event('load'))
  }
}

class ErrorImage extends EventTarget {
  set src(_value: string) {
    this.dispatchEvent(new Event('error'))
  }
}

class InvalidFileReader extends EventTarget {
  result: string | ArrayBuffer | null = new ArrayBuffer(0)

  readAsDataURL() {
    this.dispatchEvent(new Event('load'))
  }
}

describe('canvas image clipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters clipboard files to images only', () => {
    const image = new File(['x'], 'image.png', { type: 'image/png' })
    const text = new File(['x'], 'note.txt', { type: 'text/plain' })

    expect(getClipboardImageFiles({ files: [image, text] } as unknown as DataTransfer)).toEqual([
      image,
    ])
    expect(getClipboardImageFiles(null)).toEqual([])
  })

  it('reads image data url and natural size', async () => {
    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('Image', MockImage)

    await expect(
      readClipboardImage(new File(['x'], 'chart.png', { type: 'image/png' })),
    ).resolves.toEqual({
      dataUrl: 'data:image/png;base64,abc',
      mimeType: 'image/png',
      name: 'chart.png',
      naturalHeight: 80,
      naturalWidth: 120,
    })
  })

  it('falls back when image size cannot be read', async () => {
    vi.stubGlobal('FileReader', MockFileReader)
    vi.stubGlobal('Image', ErrorImage)

    await expect(
      readClipboardImage(new File(['x'], '', { type: '' })),
    ).resolves.toMatchObject({
      dataUrl: 'data:;base64,abc',
      mimeType: 'image/png',
      name: '粘贴图片.png',
    })
  })

  it('rejects unreadable image payloads', async () => {
    vi.stubGlobal('FileReader', InvalidFileReader)
    vi.stubGlobal('Image', MockImage)

    await expect(
      readClipboardImage(new File(['x'], 'chart.png', { type: 'image/png' })),
    ).rejects.toThrow('无法读取图片')
  })
})
