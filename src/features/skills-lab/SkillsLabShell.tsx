import type { PointerEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { SkillsLabPanel } from '@/features/skills-lab/components/SkillsLabPanel'
import { SkillsLabSidebar } from '@/features/skills-lab/components/SkillsLabSidebar'
import { SkillsLabWorkspace } from '@/features/skills-lab/SkillsLabWorkspace'
import {
  analyzeSkillTopic,
  createSkillTopic,
  deleteSkillTopic,
  duplicateSkillTopic,
  removeSkillBinding,
  renameSkillTopic,
  reorderSkillTopics,
  sendSkillLabMessage,
} from '@/features/skills-lab/application/skillsLabService'
import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import {
  getLocalSkillStatus,
  openLocalSkillFolder,
} from '@/features/skills-lab/infrastructure/localSkillAgentClient'
import {
  formatSkillFileChangeSummary,
  hasSkillFileChanges,
  summarizeSkillFileChanges,
} from '@/features/skills-lab/model/skillFileChanges'
import {
  findSkillTestFailureNodeId,
  isFailedSkillTestResult,
} from '@/features/skills-lab/model/skillTestResult'
import type {
  SkillLabMessage,
  SkillFileStatus,
  SkillsLabSettings,
  SkillTopic,
  ThemeMode,
  WorkspaceMode,
} from '@/shared/types'

interface SkillsLabShellProps {
  activeTopic?: SkillTopic
  activeTopicId?: string
  busy: boolean
  chatCollapsed: boolean
  chatWidth: number
  messages: SkillLabMessage[]
  mode: WorkspaceMode
  settings?: SkillsLabSettings
  sidebarCollapsed: boolean
  sidebarWidth: number
  theme: ThemeMode
  topics: SkillTopic[]
  onBusyChange: (busy: boolean) => void
  onCreateSkillDialog: (topicId: string) => void
  onModeChange: (mode: WorkspaceMode) => void
  onOpenSettings: () => void
  onPathDialog: (topicId: string) => void
  onResizeChat: (event: PointerEvent) => void
  onResizeSidebar: (event: PointerEvent) => void
  onSelectTopic: (topicId?: string) => void
  onToggleChat: () => void
  onToggleSidebar: () => void
  onToggleTheme: () => void
}

export function SkillsLabShell({
  activeTopic,
  activeTopicId,
  busy,
  chatCollapsed,
  chatWidth,
  messages,
  mode,
  settings,
  sidebarCollapsed,
  sidebarWidth,
  theme,
  topics,
  onBusyChange,
  onCreateSkillDialog,
  onModeChange,
  onOpenSettings,
  onPathDialog,
  onResizeChat,
  onResizeSidebar,
  onSelectTopic,
  onToggleChat,
  onToggleSidebar,
  onToggleTheme,
}: SkillsLabShellProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [testFailureNodeId, setTestFailureNodeId] = useState<string>()
  const [optimisticTopic, setOptimisticTopic] = useState<SkillTopic>()
  const [fileChangeState, setFileChangeState] = useState({
    changed: false,
    topicId: '',
  })
  const visibleActiveTopic = useMemo(() => {
    const shouldUseOptimisticTopic =
      activeTopic &&
      optimisticTopic?.id === activeTopic.id &&
      activeTopic.lastAnalysisAt !== optimisticTopic.lastAnalysisAt
    return shouldUseOptimisticTopic
      ? { ...activeTopic, ...optimisticTopic }
      : activeTopic
  }, [activeTopic, optimisticTopic])
  const fileChanged =
    fileChangeState.topicId === visibleActiveTopic?.id && fileChangeState.changed

  useEffect(() => {
    const topicForStatus = visibleActiveTopic
    if (!topicForStatus?.skillPath || !topicForStatus.lastFileSignature) {
      return
    }
    let canceled = false
    getLocalSkillStatus(topicForStatus.skillPath)
      .then((status) => {
        if (!canceled) {
          setFileChangeState({
            changed: Boolean(
              status.fileSignature &&
                status.fileSignature !== topicForStatus.lastFileSignature,
            ),
            topicId: topicForStatus.id,
          })
        }
      })
      .catch(() => {
        if (!canceled) {
          setFileChangeState({
            changed: false,
            topicId: topicForStatus.id,
          })
        }
      })
    return () => {
      canceled = true
    }
  }, [
    visibleActiveTopic,
  ])

  const createTopic = async () => {
    const topic = await createSkillTopic()
    onSelectTopic(topic.id)
  }

  const analyzeTopic = (topic = activeTopic) => {
    if (!topic || !settings || busy) return
    onBusyChange(true)
    void analyzeSkillTopic(topic, settings)
      .then((graph) => {
        setOptimisticTopic({
          ...topic,
          graph,
          lastAnalysisAt: graph.generatedAt,
          status: 'idle',
          error: undefined,
        })
        setSelectedNodeId(undefined)
        setTestFailureNodeId(undefined)
      })
      .finally(() => onBusyChange(false))
  }

  const renameTopic = async (topic: SkillTopic) => {
    const next = prompt('重命名 Skills 话题', topic.title)
    if (!next) return
    await renameSkillTopic(topic.id, next)
  }

  const deleteTopic = async (topic: SkillTopic) => {
    if (!confirm(`删除 Skills 话题「${topic.title}」？不会删除本地 skill 文件夹。`)) {
      return
    }
    await deleteSkillTopic(topic.id)
    if (activeTopicId === topic.id) {
      const nextTopic = topics.find((item) => item.id !== topic.id)
      onSelectTopic(nextTopic?.id)
    }
  }

  const duplicateTopic = async (topic: SkillTopic) => {
    const next = await duplicateSkillTopic(topic)
    onSelectTopic(next.id)
  }

  const sendPanelMessage = (
    kind: 'question' | 'suggestion' | 'test',
    content: string,
  ) => {
    if (!activeTopic || !settings || busy) return
    if (
      kind !== 'question' &&
      settings.permissionMode === 'allow-write' &&
      settings.requireChangeConfirmation &&
      !confirm('外部 agent 可能会修改真实 skill 文件。继续执行？')
    ) {
      return
    }
    onBusyChange(true)
    const beforeStatusPromise = getBeforeStatus(activeTopic, settings, kind)
    void beforeStatusPromise
      .then((beforeStatus) =>
        sendSkillLabMessage(activeTopic, settings, kind, content).then((answer) => ({
          answer,
          beforeStatus,
        })),
      )
      .then(async ({ answer, beforeStatus }) => {
        if (kind === 'test') {
          const failureNodeId = findSkillTestFailureNodeId(
            answer,
            visibleActiveTopic?.graph,
            selectedNodeId,
          )
          setTestFailureNodeId(failureNodeId)
          if (failureNodeId && isFailedSkillTestResult(answer)) {
            await skillsLabRepository.addMessage({
              topicId: activeTopic.id,
              role: 'assistant',
              kind: 'analysis',
              content: `测试失败点已标记到画布节点：${getNodeLabel(activeTopic, failureNodeId)}。`,
              nodeId: failureNodeId,
              status: 'complete',
            })
          }
        }
        if (
          kind === 'question' ||
          settings.permissionMode !== 'allow-write' ||
          !activeTopic.skillPath
        ) {
          return
        }
        const nextStatus = await getLocalSkillStatus(activeTopic.skillPath)
        if (
          nextStatus.fileSignature &&
          activeTopic.lastFileSignature &&
          nextStatus.fileSignature !== activeTopic.lastFileSignature
        ) {
          const summary = beforeStatus
            ? summarizeSkillFileChanges(beforeStatus, nextStatus)
            : undefined
          await skillsLabRepository.addMessage({
            topicId: activeTopic.id,
            role: 'assistant',
            kind: 'analysis',
            content: summary && hasSkillFileChanges(summary)
              ? formatSkillFileChangeSummary(summary)
              : '检测到外部 agent 修改了本地 skill 文件，已重新解读并刷新画布。',
            status: 'complete',
          })
          await analyzeSkillTopic(activeTopic, settings)
        }
      })
      .finally(() => onBusyChange(false))
  }

  return (
    <>
      <SkillsLabSidebar
        activeTopicId={activeTopicId}
        collapsed={sidebarCollapsed}
        mode={mode}
        settings={settings}
        theme={theme}
        topics={topics}
        width={sidebarWidth}
        onAnalyzeTopic={analyzeTopic}
        onCreateSkill={(topic) => onCreateSkillDialog(topic.id)}
        onCreateTopic={() => void createTopic()}
        onDeleteTopic={(topic) => void deleteTopic(topic)}
        onDuplicateTopic={(topic) => void duplicateTopic(topic)}
        onModeChange={onModeChange}
        onOpenFolder={(topic) => {
          if (!topic.skillPath) return
          void openLocalSkillFolder(topic.skillPath).catch(() => {
            void navigator.clipboard?.writeText(topic.skillPath ?? '')
          })
        }}
        onOpenSettings={onOpenSettings}
        onRenameTopic={(topic) => void renameTopic(topic)}
        onReorderTopics={(draggedId, targetId) =>
          reorderSkillTopics(topics, draggedId, targetId)
        }
        onResizeStart={onResizeSidebar}
        onSelectSkill={(topic) => onPathDialog(topic.id)}
        onSelectTopic={(topicId) => {
          onSelectTopic(topicId)
          setSelectedNodeId(undefined)
          setTestFailureNodeId(undefined)
        }}
        onToggle={onToggleSidebar}
        onToggleTheme={onToggleTheme}
        onUnbindSkill={(topic) => void removeSkillBinding(topic.id)}
      />

      <SkillsLabWorkspace
        activeTopic={visibleActiveTopic}
        fileChanged={fileChanged}
        selectedNodeId={selectedNodeId}
        testFailureNodeId={testFailureNodeId}
        onAnalyze={analyzeTopic}
        onSelectSkill={(topic) => onPathDialog(topic.id)}
        onSelectedNodeChange={setSelectedNodeId}
      />

      <SkillsLabPanel
        activeTopic={visibleActiveTopic}
        busy={busy}
        collapsed={chatCollapsed}
        fileChanged={fileChanged}
        messages={messages}
        selectedNodeId={selectedNodeId}
        testFailureNodeId={testFailureNodeId}
        width={chatWidth}
        onClearMessages={() => {
          if (activeTopicId) void skillsLabRepository.clearMessages(activeTopicId)
        }}
        onFocusNode={(nodeId) => setSelectedNodeId(nodeId)}
        onResizeStart={onResizeChat}
        onSend={sendPanelMessage}
        onToggle={onToggleChat}
      />
    </>
  )
}

function getBeforeStatus(
  topic: SkillTopic,
  settings: SkillsLabSettings,
  kind: 'question' | 'suggestion' | 'test',
): Promise<SkillFileStatus | undefined> {
  if (
    kind === 'question' ||
    settings.permissionMode !== 'allow-write' ||
    !topic.skillPath
  ) {
    return Promise.resolve(undefined)
  }
  return getLocalSkillStatus(topic.skillPath).catch(() => undefined)
}

function getNodeLabel(topic: SkillTopic, nodeId: string) {
  return topic.graph?.nodes.find((node) => node.id === nodeId)?.label ?? nodeId
}
