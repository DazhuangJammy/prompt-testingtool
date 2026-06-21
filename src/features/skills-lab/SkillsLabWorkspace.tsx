import { RefreshCw, Link } from 'lucide-react'
import { useState } from 'react'
import { WorkspaceTopbar } from '@/features/canvas/WorkspaceTopbar'
import { SkillsGraphCanvas } from '@/features/skills-lab/components/SkillsGraphCanvas'
import type { SkillTopic } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface SkillsLabWorkspaceProps {
  activeTopic?: SkillTopic
  fileChanged?: boolean
  onAnalyze: (topic: SkillTopic) => void
  onSelectSkill: (topic: SkillTopic) => void
  onSelectedNodeChange: (nodeId?: string) => void
  selectedNodeId?: string
  testFailureNodeId?: string
}

export function SkillsLabWorkspace({
  activeTopic,
  fileChanged = false,
  onAnalyze,
  onSelectSkill,
  onSelectedNodeChange,
  selectedNodeId,
  testFailureNodeId,
}: SkillsLabWorkspaceProps) {
  const [localSelectedNodeId, setLocalSelectedNodeId] = useState<string | undefined>()
  const effectiveSelectedNodeId = selectedNodeId ?? localSelectedNodeId
  const updateSelectedNode = (nodeId?: string) => {
    setLocalSelectedNodeId(nodeId)
    onSelectedNodeChange(nodeId)
  }

  return (
    <main className="workspace skills-workspace">
      <WorkspaceTopbar title={activeTopic?.title ?? 'Skills Lab'}>
        {fileChanged && <span className="topbar-status-pill">文件已变化</span>}
        <IconButton
          icon={<Link />}
          label="选择 Skill"
          disabled={!activeTopic}
          onClick={() => {
            if (activeTopic) onSelectSkill(activeTopic)
          }}
        />
        <IconButton
          icon={<RefreshCw />}
          label="解读"
          disabled={!activeTopic?.skillPath || activeTopic.status === 'analyzing'}
          onClick={() => {
            if (activeTopic) onAnalyze(activeTopic)
          }}
        />
      </WorkspaceTopbar>
      <SkillsGraphCanvas
        topic={activeTopic}
        selectedNodeId={effectiveSelectedNodeId}
        testFailureNodeId={testFailureNodeId}
        onAnalyze={onAnalyze}
        onSelectSkill={onSelectSkill}
        onSelectedNodeChange={updateSelectedNode}
      />
    </main>
  )
}
