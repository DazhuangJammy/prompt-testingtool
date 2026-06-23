import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchKnowledgeRemoteText } from '@/shared/api/knowledge'
import { fetchSitemapUrls, fetchUrlText, parseKnowledgeFile } from './documentParser'

vi.mock('@/shared/api/knowledge', () => ({
  fetchKnowledgeRemoteText: vi.fn(),
}))

describe('document parser', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reads plain text formats directly', async () => {
    const file = new File(['hello knowledge'], 'note.md', { type: 'text/markdown' })

    await expect(parseKnowledgeFile(file)).resolves.toBe('hello knowledge')
  })

  it('converts html files to text and strips inactive content', async () => {
    const file = new File([
      '<main>Visible</main><script>hidden()</script><style>.x{}</style>',
    ], 'page.html', { type: 'text/html' })

    await expect(parseKnowledgeFile(file)).resolves.toBe('Visible')
  })

  it('reads remote html through the local proxy', async () => {
    vi.mocked(fetchKnowledgeRemoteText).mockResolvedValue({
      url: 'https://example.com',
      contentType: 'text/html',
      text: '<article>Remote page</article>',
    })

    await expect(fetchUrlText('https://example.com')).resolves.toBe('Remote page')
    expect(fetchKnowledgeRemoteText).toHaveBeenCalledWith('https://example.com')
  })

  it('returns remote plain text without html parsing', async () => {
    vi.mocked(fetchKnowledgeRemoteText).mockResolvedValue({
      url: 'https://example.com/readme.txt',
      contentType: 'text/plain',
      text: 'plain remote text',
    })

    await expect(fetchUrlText('https://example.com/readme.txt')).resolves.toBe('plain remote text')
  })

  it('extracts sitemap locations and caps them', async () => {
    vi.mocked(fetchKnowledgeRemoteText).mockResolvedValue({
      url: 'https://example.com/sitemap.xml',
      contentType: 'application/xml',
      text: `<urlset>${Array.from({ length: 105 }, (_, index) =>
        `<url><loc>https://example.com/${index}</loc></url>`,
      ).join('')}</urlset>`,
    })

    const urls = await fetchSitemapUrls('https://example.com/sitemap.xml')

    expect(urls).toHaveLength(100)
    expect(urls[0]).toBe('https://example.com/0')
    expect(urls.at(-1)).toBe('https://example.com/99')
  })

  it('rejects unsupported files', async () => {
    const file = new File(['binary'], 'tool.exe')

    await expect(parseKnowledgeFile(file)).rejects.toThrow('不支持的文件格式')
  })
})
