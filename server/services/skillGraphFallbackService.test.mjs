import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildFallbackSkillGraph,
  getSkillFileStatus,
  listLocalSkillDirectories,
} from './skillGraphFallbackService.mjs'

let tempRoot

afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
  tempRoot = undefined
})

describe('skill graph fallback service', () => {
  it('builds a graph from SKILL.md and referenced files', () => {
    tempRoot = join(tmpdir(), `skill-fallback-${crypto.randomUUID()}`)
    const skillPath = join(tempRoot, 'demo-skill')
    mkdirSync(join(skillPath, 'references'), { recursive: true })
    mkdirSync(join(skillPath, 'scripts'), { recursive: true })
    writeFileSync(
      join(skillPath, 'SKILL.md'),
      `---
name: demo-skill
description: Use when testing fallback graph generation.
---

# Demo

Use when the user asks for a demo. Read references/guide.md and run scripts/check.js.
`,
    )
    writeFileSync(join(skillPath, 'references', 'guide.md'), '# Guide')
    writeFileSync(join(skillPath, 'scripts', 'check.js'), 'console.log("ok")')

    const result = buildFallbackSkillGraph(skillPath)

    expect(result.graph.skill.name).toBe('demo-skill')
    expect(result.graph.nodes.some((node) => node.id === 'skill-md')).toBe(true)
    expect(
      result.graph.edges.some(
        (edge) => edge.to === 'file:references/guide.md' && edge.confidence === 'explicit',
      ),
    ).toBe(true)
    expect(result.fileSignature).toContain('SKILL.md')
    expect(getSkillFileStatus(skillPath).files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'SKILL.md' }),
        expect.objectContaining({ path: 'references/guide.md' }),
      ]),
    )
  })

  it('lists local skill directories that contain SKILL.md', () => {
    tempRoot = join(tmpdir(), `skill-list-${crypto.randomUUID()}`)
    mkdirSync(join(tempRoot, 'with-skill'), { recursive: true })
    mkdirSync(join(tempRoot, 'without-skill'), { recursive: true })
    writeFileSync(join(tempRoot, 'with-skill', 'SKILL.md'), '# Skill')

    expect(listLocalSkillDirectories(tempRoot)).toEqual([
      {
        name: 'with-skill',
        path: join(tempRoot, 'with-skill'),
        hasSkillMarkdown: true,
      },
    ])
  })
})
