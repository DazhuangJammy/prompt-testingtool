import type { SkillGraph } from '@/shared/types'

const FAILURE_PATTERN =
  /失败|未通过|报错|错误|error|failed|failure|exception|cannot|can't|无法/i

export function isFailedSkillTestResult(answer?: string) {
  return FAILURE_PATTERN.test(answer ?? '')
}

export function findSkillTestFailureNodeId(
  answer: string | undefined,
  graph: SkillGraph | undefined,
  selectedNodeId?: string,
) {
  if (!isFailedSkillTestResult(answer)) return undefined
  if (selectedNodeId) return selectedNodeId

  const issueNodeId = graph?.issues.find((issue) => issue.nodeId)?.nodeId
  if (issueNodeId) return issueNodeId

  return graph?.nodes.find((node) => node.type === 'test')?.id
}
