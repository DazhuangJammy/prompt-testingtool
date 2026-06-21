import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Box, Code2, File, FileText, Folder, GitBranch, TestTube } from 'lucide-react'
import { memo } from 'react'
import type { SkillGraphFlowNode } from '@/features/skills-lab/model/skillGraphLayout'
import {
  getConfidenceLabel,
  getNodeTypeLabel,
} from '@/features/skills-lab/model/skillGraphLayout'
import type { SkillGraphNodeType } from '@/shared/types'

const nodeIcons: Record<SkillGraphNodeType, typeof File> = {
  main: FileText,
  rule: GitBranch,
  reference: File,
  asset: Box,
  script: Code2,
  test: TestTube,
  folder: Folder,
  unknown: File,
}

function SkillGraphNode({ data }: NodeProps<SkillGraphFlowNode>) {
  const { node, onSelect, selectedNodeId, testFailureNodeId } = data
  const selected = selectedNodeId === node.id
  const testFailed = testFailureNodeId === node.id
  const Icon = nodeIcons[node.type]

  return (
    <section
      className={`skill-graph-node is-${node.type} ${
        selected ? 'is-selected' : ''
      } ${testFailed ? 'is-test-failed' : ''} is-${node.confidence}`}
      onClick={() => onSelect(node.id)}
    >
      <Handle
        id="left"
        className="canvas-connection-handle"
        position={Position.Left}
        type="target"
      />
      <Handle
        id="right"
        className="canvas-connection-handle"
        position={Position.Right}
        type="source"
      />
      <div className="skill-graph-node-head">
        <Icon />
        <span>{node.label}</span>
      </div>
      <div className="skill-graph-node-meta">
        <span>{getNodeTypeLabel(node.type)}</span>
        <span>{getConfidenceLabel(node.confidence)}</span>
        {testFailed && <span className="is-danger">测试失败点</span>}
      </div>
      {node.body && <p>{node.body}</p>}
      {node.file && <small>{node.file}</small>}
    </section>
  )
}

export default memo(SkillGraphNode)
