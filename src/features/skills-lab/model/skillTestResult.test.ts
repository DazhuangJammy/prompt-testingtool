import { describe, expect, it } from 'vitest'
import type { SkillGraph } from '@/shared/types'
import { findSkillTestFailureNodeId, isFailedSkillTestResult } from './skillTestResult'

const graph: SkillGraph = {
  skill: {
    name: 'demo',
    description: 'Demo',
    sourcePath: '/skills/demo',
  },
  summary: 'summary',
  nodes: [
    { id: 'main', type: 'main', label: 'SKILL.md', confidence: 'explicit' },
    { id: 'test-node', type: 'test', label: '测试', confidence: 'inferred' },
  ],
  edges: [],
  issues: [
    {
      id: 'issue',
      severity: 'error',
      title: '触发条件失败',
      detail: '未通过',
      nodeId: 'main',
    },
  ],
  testSuggestions: [],
  generatedAt: 'now',
}

describe('skillTestResult', () => {
  it('detects failed test output', () => {
    expect(isFailedSkillTestResult('测试未通过：触发条件错误')).toBe(true)
    expect(isFailedSkillTestResult('测试通过')).toBe(false)
  })

  it('prefers the selected node when a test fails', () => {
    expect(findSkillTestFailureNodeId('failed', graph, 'test-node')).toBe('test-node')
  })

  it('falls back to issue node and test node', () => {
    expect(findSkillTestFailureNodeId('failed', graph)).toBe('main')
    expect(findSkillTestFailureNodeId('failed', { ...graph, issues: [] })).toBe(
      'test-node',
    )
    expect(findSkillTestFailureNodeId('测试通过', graph)).toBeUndefined()
  })
})
