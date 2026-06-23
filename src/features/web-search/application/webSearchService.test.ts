import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestWebSearch } from '@/shared/api/webSearch'
import { createDefaultWebSearchSettings } from '../model/webSearchSettings'
import { resolveChatWebSearchContext } from './webSearchService'

vi.mock('@/shared/api/webSearch', () => ({
  requestWebSearch: vi.fn(),
}))

describe('webSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty context without query or settings', async () => {
    await expect(
      resolveChatWebSearchContext({ query: '  ', settings: undefined }),
    ).resolves.toEqual({ context: '', references: [] })
  })

  it('searches with the active provider and builds model context', async () => {
    const settings = createDefaultWebSearchSettings()
    vi.mocked(requestWebSearch).mockResolvedValue({
      query: 'hello',
      providerId: 'bing',
      providerName: 'Bing',
      results: [
        {
          title: 'Result',
          content: 'Useful content',
          url: 'https://example.com',
          sourceInput: 'hello',
        },
      ],
    })

    const result = await resolveChatWebSearchContext({ query: 'hello', settings })

    expect(requestWebSearch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bing' }),
      settings,
      'hello',
      undefined,
    )
    expect(result.context).toContain('[1] Result')
    expect(result.references).toEqual([
      expect.objectContaining({ providerId: 'bing', providerName: 'Bing' }),
    ])
  })

  it('uses the selected provider when one is supplied for this chat', async () => {
    const settings = createDefaultWebSearchSettings()
    vi.mocked(requestWebSearch).mockResolvedValue({
      query: 'hello',
      providerId: 'baidu',
      providerName: 'Baidu',
      results: [],
    })

    await resolveChatWebSearchContext({
      providerId: 'baidu',
      query: 'hello',
      settings,
    })

    expect(requestWebSearch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'baidu' }),
      settings,
      'hello',
      undefined,
    )
  })

  it('throws when no runnable provider exists', async () => {
    const settings = {
      ...createDefaultWebSearchSettings(),
      providers: createDefaultWebSearchSettings().providers.map((provider) => ({
        ...provider,
        enabled: false,
      })),
    }

    await expect(resolveChatWebSearchContext({ query: 'hello', settings }))
      .rejects.toThrow('请先在设置里配置可用的网络搜索服务商')
  })
})
