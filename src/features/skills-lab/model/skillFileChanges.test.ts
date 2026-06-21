import { describe, expect, it } from 'vitest'
import {
  formatSkillFileChangeSummary,
  hasSkillFileChanges,
  summarizeSkillFileChanges,
} from './skillFileChanges'

describe('skillFileChanges', () => {
  it('summarizes added, modified, and removed files', () => {
    const summary = summarizeSkillFileChanges(
      {
        fileSignature: 'before',
        files: [
          { path: 'SKILL.md', size: 10, mtimeMs: 1 },
          { path: 'references/old.md', size: 8, mtimeMs: 1 },
          { path: 'scripts/check.js', size: 6, mtimeMs: 1 },
        ],
      },
      {
        fileSignature: 'after',
        files: [
          { path: 'SKILL.md', size: 12, mtimeMs: 2 },
          { path: 'scripts/check.js', size: 6, mtimeMs: 1 },
          { path: 'tests/demo.md', size: 5, mtimeMs: 1 },
        ],
      },
    )

    expect(summary).toEqual({
      added: ['tests/demo.md'],
      modified: ['SKILL.md'],
      removed: ['references/old.md'],
    })
    expect(hasSkillFileChanges(summary)).toBe(true)
    expect(formatSkillFileChangeSummary(summary)).toContain('修改：SKILL.md')
  })

  it('handles unchanged file lists', () => {
    const summary = summarizeSkillFileChanges(
      { files: [{ path: 'SKILL.md', size: 10, mtimeMs: 1 }] },
      { files: [{ path: 'SKILL.md', size: 10, mtimeMs: 1 }] },
    )

    expect(hasSkillFileChanges(summary)).toBe(false)
  })
})
