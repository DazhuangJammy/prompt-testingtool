import { describe, expect, it } from 'vitest'
import {
  isSvgDocument,
  repairStreamingSvg,
  splitSvgPreviewBlocks,
  svgToDataUrl,
} from './svgPreview'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="red"/>
</SVg>`

describe('svg preview model', () => {
  it('detects SVG documents with the required xmlns and case-insensitive ending', () => {
    expect(isSvgDocument(svg)).toBe(true)
    expect(isSvgDocument('<svg><rect /></svg>')).toBe(false)
  })

  it('keeps ordinary markdown untouched when no SVG exists', () => {
    expect(splitSvgPreviewBlocks('只是文字')).toEqual([
      { kind: 'markdown', id: 'markdown-0', markdown: '只是文字' },
    ])
    expect(splitSvgPreviewBlocks('   ')).toEqual([])
  })

  it('splits raw SVG blocks from surrounding markdown', () => {
    const blocks = splitSvgPreviewBlocks(`前文\n\n${svg}\n\n后文`)

    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toMatchObject({ kind: 'markdown', markdown: '前文\n\n' })
    expect(blocks[1]).toMatchObject({
      kind: 'svg',
      svg,
      filename: 'svg-preview-1.svg',
    })
    expect(blocks[2]).toMatchObject({ kind: 'markdown', markdown: '\n\n后文' })
  })

  it('splits fenced SVG code blocks without rendering the code fence', () => {
    const blocks = splitSvgPreviewBlocks(`结果如下：\n\n\`\`\`svg\n${svg}\n\`\`\``)

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ kind: 'markdown', markdown: '结果如下：\n\n' })
    expect(blocks[1]).toMatchObject({ kind: 'svg', svg })
  })

  it('repairs streaming SVG fragments so they can render while generating', () => {
    const repaired = repairStreamingSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
        <g>
          <rect width="120" height="80" fill="red">`,
    )

    expect(repaired).toContain('</rect></g></svg>')
  })

  it('does not repair text before a usable SVG tag exists', () => {
    expect(repairStreamingSvg('hello')).toBe('')
    expect(repairStreamingSvg('<svg xmlns="http://www.w3.org/2000/svg"')).toBe('')
  })

  it('returns complete SVG documents without adding extra tags', () => {
    const complete = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`

    expect(repairStreamingSvg(complete)).toBe(complete)
    expect(splitSvgPreviewBlocks(complete)[0]).toMatchObject({
      kind: 'svg',
      status: 'complete',
    })
  })

  it('keeps valid closing tags balanced while repairing streaming SVG', () => {
    const repaired = repairStreamingSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><g><text>Hi</text>`,
    )

    expect(repaired.endsWith('</g></svg>')).toBe(true)
    expect(repaired.match(/<\/text>/g)).toHaveLength(1)
  })

  it('splits unfinished SVG blocks as streaming previews', () => {
    const blocks = splitSvgPreviewBlocks(`生成中：\n\n\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="red">`)

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ kind: 'markdown', markdown: '生成中：\n\n' })
    expect(blocks[1]).toMatchObject({ kind: 'svg', status: 'streaming' })
  })

  it('encodes SVG as an image data URL', () => {
    expect(svgToDataUrl(svg)).toContain('data:image/svg+xml;charset=utf-8,')
    expect(decodeURIComponent(svgToDataUrl(svg))).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg"',
    )
  })
})
