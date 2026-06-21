import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react'
import { Bot, Link, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import SkillGraphNode from '@/features/skills-lab/components/SkillGraphNode'
import {
  createSkillGraphFlowEdges,
  createSkillGraphFlowNodes,
  type SkillGraphFlowNode,
} from '@/features/skills-lab/model/skillGraphLayout'
import type { SkillTopic } from '@/shared/types'

const nodeTypes = {
  skillGraphNode: SkillGraphNode,
} satisfies NodeTypes

const proOptions = { hideAttribution: true }

interface SkillsGraphCanvasProps {
  topic?: SkillTopic
  onAnalyze: (topic: SkillTopic) => void
  onSelectSkill: (topic: SkillTopic) => void
  selectedNodeId?: string
  testFailureNodeId?: string
  onSelectedNodeChange: (nodeId?: string) => void
}

export function SkillsGraphCanvas({
  topic,
  onAnalyze,
  onSelectSkill,
  selectedNodeId,
  testFailureNodeId,
  onSelectedNodeChange,
}: SkillsGraphCanvasProps) {
  const reactFlow = useReactFlow<SkillGraphFlowNode, Edge>()
  const initializedGraphIdRef = useRef('')
  const nodes = useMemo(
    () =>
      createSkillGraphFlowNodes(
        topic?.graph,
        selectedNodeId,
        testFailureNodeId,
        (nodeId) => onSelectedNodeChange(nodeId),
      ),
    [onSelectedNodeChange, selectedNodeId, testFailureNodeId, topic?.graph],
  )
  const edges = useMemo(() => createSkillGraphFlowEdges(topic?.graph), [topic?.graph])
  const graphId = `${topic?.id ?? 'empty'}:${topic?.lastAnalysisAt ?? ''}`

  useEffect(() => {
    if (!nodes.length || initializedGraphIdRef.current === graphId) return
    initializedGraphIdRef.current = graphId
    window.requestAnimationFrame(() => {
      reactFlow.fitView({ duration: 260, padding: 0.22 })
    })
  }, [graphId, nodes.length, reactFlow])

  return (
    <div className="flow-wrap skills-flow-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        onPaneClick={() => onSelectedNodeChange(undefined)}
      >
        <Background
          color="var(--canvas-dot)"
          gap={22}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls position="bottom-left" />
        <MiniMap pannable zoomable />
        <div className="skill-graph-legend">
          <span><i className="legend-line is-explicit" />明确引用</span>
          <span><i className="legend-line is-rule" />规则触发</span>
          <span><i className="legend-line is-inferred" />AI 推断</span>
        </div>
        {!topic ? (
          <EmptyState
            icon={<Bot />}
            title="还没有 Skills 话题"
            body="先在左侧新建一个 Skills 话题，再绑定本地 skill 文件夹。"
          />
        ) : !topic.skillPath ? (
          <EmptyState
            icon={<Link />}
            title="选择一个本地 Skill"
            body="Skills Lab 只映射本地文件，不在画布里保存另一份 skill。"
            actionLabel="选择 Skill"
            onAction={() => onSelectSkill(topic)}
          />
        ) : topic.status === 'analyzing' ? (
          <EmptyState
            icon={<RefreshCw />}
            title="正在解读 Skill"
            body="本地 agent 正在读取 SKILL.md 和相关文件，完成后会刷新图谱。"
          />
        ) : !topic.graph ? (
          <EmptyState
            icon={<Bot />}
            title="等待解读"
            body="点击解读后，会调用设置里的本地 agent 生成关系图。"
            actionLabel="解读"
            onAction={() => onAnalyze(topic)}
          />
        ) : null}
      </ReactFlow>
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="skill-canvas-empty">
      <div className="skill-canvas-empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
