import { describe, expect, it } from 'vitest'
import { groupProviderModels } from './providerModelGroups'

describe('provider model groups', () => {
  it('groups fetched model ids by stable model family instead of every dated id', () => {
    const groups = groupProviderModels(
      [
        { id: 'qwen3.7-plus-2026-05-26', enabled: true },
        { id: 'qwen3.7-max-2026-05-17', enabled: true },
        { id: 'text-embedding-v4', enabled: true },
      ],
      'family',
    )

    expect(groups.map((group) => group.label)).toEqual(['qwen3.7', 'text'])
    expect(groups[0]?.models).toHaveLength(2)
  })
})
