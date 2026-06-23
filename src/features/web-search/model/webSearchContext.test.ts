import { describe, expect, it } from 'vitest'
import {
  appendMissingWebSearchCitationMarks,
  createWebSearchContext,
} from './webSearchContext'

describe('webSearchContext', () => {
  it('builds numbered source context for model citation', () => {
    const result = createWebSearchContext(
      [
        {
          title: 'Example',
          content: 'A useful source',
          url: 'https://example.com',
          sourceInput: 'query',
          providerId: 'bing',
          providerName: 'Bing',
        },
      ],
      { compression: { method: 'none', cutoffLimit: 2000 } },
    )

    expect(result.context).toContain('[1] Example')
    expect(result.context).toContain('https://example.com')
    expect(result.references).toHaveLength(1)
  })

  it('appends missing citation marks only for unused references', () => {
    expect(
      appendMissingWebSearchCitationMarks('answer [1]', [
        {
          title: 'A',
          content: 'A',
          url: 'https://a.test',
          sourceInput: 'q',
          providerId: 'bing',
          providerName: 'Bing',
        },
        {
          title: 'B',
          content: 'B',
          url: 'https://b.test',
          sourceInput: 'q',
          providerId: 'bing',
          providerName: 'Bing',
        },
      ]),
    ).toBe('answer [1] [2]')
  })

  it('returns empty context without references and applies cutoff compression', () => {
    expect(
      createWebSearchContext([], { compression: { method: 'none', cutoffLimit: 2000 } }),
    ).toEqual({ context: '', references: [] })

    const result = createWebSearchContext(
      [
        {
          title: '',
          content: '123456789',
          url: 'https://example.com',
          sourceInput: 'query',
          providerId: 'bing',
          providerName: 'Bing',
        },
      ],
      { compression: { method: 'cutoff', cutoffLimit: 4 } },
    )

    expect(result.context).toContain('摘要: 1234')
    expect(result.references[0].title).toBe('https://example.com')
  })
})
