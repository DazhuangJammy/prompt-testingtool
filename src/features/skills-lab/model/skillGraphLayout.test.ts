import { describe, expect, it } from 'vitest'
import type { SkillGraph } from '@/shared/types'
import {
  createSkillGraphFlowEdges,
  createSkillGraphFlowNodes,
  getConfidenceLabel,
  getNodeTypeLabel,
  getRelationLabel,
} from './skillGraphLayout'

const graph: SkillGraph = {
  skill: {
    name: 'demo',
    description: 'Demo skill',
    sourcePath: '/tmp/demo',
    sourceFile: 'SKILL.md',
  },
  summary: 'summary',
  generatedAt: 'now',
  nodes: [
    {
      id: 'main',
      type: 'main',
      label: 'SKILL.md',
      confidence: 'explicit',
    },
    {
      id: 'rule',
      type: 'rule',
      label: '触发条件',
      confidence: 'rule',
    },
    {
      id: 'ref',
      type: 'reference',
      label: 'guide',
      confidence: 'inferred',
    },
  ],
  edges: [
    {
      id: 'e1',
      from: 'main',
      to: 'rule',
      relation: 'triggers',
      confidence: 'rule',
    },
    {
      id: 'e2',
      from: 'main',
      to: 'ref',
      relation: 'reads',
      confidence: 'inferred',
    },
  ],
  issues: [],
  testSuggestions: [],
}

describe('skillGraphLayout', () => {
  it('maps skill graph nodes into stable columns', () => {
    const nodes = createSkillGraphFlowNodes(graph, 'rule', 'ref', () => undefined)

    expect(nodes.map((node) => node.id)).toEqual(['main', 'rule', 'ref'])
    expect(nodes[0].position.x).toBe(0)
    expect(nodes[1].position.x).toBe(310)
    expect(nodes[1].selected).toBe(true)
    expect(nodes[2].data.testFailureNodeId).toBe('ref')
  })

  it('returns empty flow items when no graph exists', () => {
    expect(
      createSkillGraphFlowNodes(undefined, undefined, undefined, () => undefined),
    ).toEqual([])
    expect(createSkillGraphFlowEdges(undefined)).toEqual([])
  })

  it('maps edges with confidence styling', () => {
    const edges = createSkillGraphFlowEdges(graph)

    expect(edges).toHaveLength(2)
    expect(edges[0].animated).toBe(true)
    expect(edges[0].style).toMatchObject({ strokeWidth: 1.4 })
    expect(edges[1].style).toMatchObject({ strokeDasharray: '6 5' })
  })

  it('returns Chinese labels for visible graph metadata', () => {
    expect(getNodeTypeLabel('script')).toBe('脚本')
    expect(getConfidenceLabel('explicit')).toBe('明确引用')
    expect(getRelationLabel('tests')).toBe('测试')
  })
})
