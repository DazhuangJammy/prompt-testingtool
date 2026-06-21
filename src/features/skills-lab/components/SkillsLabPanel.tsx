import {
  Lightbulb,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Send,
  Trash2,
} from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getConfidenceLabel,
  getNodeTypeLabel,
} from '@/features/skills-lab/model/skillGraphLayout'
import type { SkillLabMessage, SkillTopic } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'

type SkillMessageKind = 'question' | 'suggestion' | 'test'

interface SkillsLabPanelProps {
  activeTopic?: SkillTopic
  busy: boolean
  collapsed: boolean
  fileChanged?: boolean
  messages: SkillLabMessage[]
  selectedNodeId?: string
  testFailureNodeId?: string
  width: number
  onClearMessages: () => void
  onFocusNode: (nodeId: string) => void
  onResizeStart: (event: PointerEvent) => void
  onSend: (kind: SkillMessageKind, content: string) => void
  onToggle: () => void
}

export function SkillsLabPanel({
  activeTopic,
  busy,
  collapsed,
  fileChanged = false,
  messages,
  selectedNodeId,
  testFailureNodeId,
  width,
  onClearMessages,
  onFocusNode,
  onResizeStart,
  onSend,
  onToggle,
}: SkillsLabPanelProps) {
  const [input, setInput] = useState('')
  const [kind, setKind] = useState<SkillMessageKind>('question')
  const messageListRef = useRef<HTMLDivElement>(null)
  const selectedNode = useMemo(
    () => activeTopic?.graph?.nodes.find((node) => node.id === selectedNodeId),
    [activeTopic?.graph?.nodes, selectedNodeId],
  )
  const testFailureNode = useMemo(
    () => activeTopic?.graph?.nodes.find((node) => node.id === testFailureNodeId),
    [activeTopic?.graph?.nodes, testFailureNodeId],
  )
  const disabled = busy || !activeTopic?.skillPath

  useEffect(() => {
    const messageList = messageListRef.current
    if (!messageList) return
    messageList.scrollTop = messageList.scrollHeight
  }, [messages])

  const send = () => {
    if (!input.trim() || disabled) return
    onSend(kind, input)
    setInput('')
  }

  return (
    <aside
      className={`chat-panel skills-panel ${collapsed ? 'is-collapsed' : ''}`}
      style={{ '--panel-width': `${width}px` } as CSSProperties}
    >
      {!collapsed && (
        <button
          type="button"
          className="panel-resizer is-left"
          aria-label="调整宽度"
          onPointerDown={onResizeStart}
        />
      )}
      <div className="panel-head">
        {!collapsed && <span>{activeTopic?.title ?? 'Skills Lab'}</span>}
        <div className="panel-head-actions">
          {!collapsed && (
            <IconButton
              icon={<Trash2 />}
              label="清空"
              disabled={!messages.length}
              onClick={onClearMessages}
            />
          )}
          <IconButton
            icon={collapsed ? <PanelRightOpen /> : <PanelRightClose />}
            label={collapsed ? '展开' : '收起'}
            onClick={onToggle}
          />
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="skills-panel-meta">
            {fileChanged && (
              <p className="skills-file-changed">
                本地文件已变化，建议重新解读后再继续提问或测试。
              </p>
            )}
            {selectedNode ? (
              <>
                <strong>{selectedNode.label}</strong>
                <span>{getNodeTypeLabel(selectedNode.type)}</span>
                <span>{getConfidenceLabel(selectedNode.confidence)}</span>
                {selectedNode.file && <small>{selectedNode.file}</small>}
                {selectedNode.evidence && <p>{selectedNode.evidence}</p>}
              </>
            ) : activeTopic?.graph ? (
              <>
                <strong>{activeTopic.graph.skill.name}</strong>
                <span>{activeTopic.graph.nodes.length} 个节点</span>
                <span>{activeTopic.graph.edges.length} 条关系</span>
                <p>{activeTopic.graph.summary}</p>
                {activeTopic.graph.issues.slice(0, 2).map((issue) => (
                  <p key={issue.id}>风险：{issue.title}。{issue.detail}</p>
                ))}
                {activeTopic.graph.testSuggestions.slice(0, 2).map((suggestion) => (
                  <p key={suggestion}>测试建议：{suggestion}</p>
                ))}
              </>
            ) : (
              <p>选择或解读一个 Skill 后，这里会显示证据和讲解。</p>
            )}
            {testFailureNode && (
              <p className="skills-test-failure-note">
                测试失败点：{testFailureNode.label}
              </p>
            )}
          </div>

          <div className="message-list skills-message-list" ref={messageListRef}>
            {messages.length ? (
              messages.map((message) => (
                <article
                  className={`message ${
                    message.role === 'user' ? 'is-user' : 'is-assistant'
                  } ${message.format === 'terminal' ? 'is-terminal' : ''}`}
                  key={message.id}
                >
                  <div className="message-bubble">
                    <div className="skill-message-kind">
                      {getKindLabel(message.kind)}
                    </div>
                    {message.nodeId && (
                      <button
                        type="button"
                        className="skill-message-node-link"
                        onClick={() => onFocusNode(message.nodeId ?? '')}
                      >
                        定位：{getMessageNodeLabel(activeTopic, message.nodeId)}
                      </button>
                    )}
                    {message.format === 'terminal' ? (
                      <div
                        className={`skill-terminal-output ${
                          message.status === 'streaming' ? 'is-streaming' : ''
                        }`}
                      >
                        {message.content}
                      </div>
                    ) : (
                      <MarkdownRenderer>{message.content}</MarkdownRenderer>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="skills-message-empty">
                右侧栏只做提问、优化建议和运行测试，真实修改交给外部 agent。
              </div>
            )}
          </div>

          {activeTopic?.error && <div className="error-line">{activeTopic.error}</div>}

          <div className="skills-composer">
            <div className="skills-mode-tabs">
              <button
                type="button"
                className={kind === 'question' ? 'is-active' : ''}
                onClick={() => setKind('question')}
              >
                <MessageSquare />
                <span>提问</span>
              </button>
              <button
                type="button"
                className={kind === 'suggestion' ? 'is-active' : ''}
                onClick={() => setKind('suggestion')}
              >
                <Lightbulb />
                <span>优化</span>
              </button>
              <button
                type="button"
                className={kind === 'test' ? 'is-active' : ''}
                onClick={() => setKind('test')}
              >
                <Play />
                <span>测试</span>
              </button>
            </div>
            <textarea
              value={input}
              disabled={disabled}
              placeholder={getPlaceholder(kind)}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
            />
            {kind === 'test' && (
              <div className="skills-test-templates" aria-label="测试模板">
                {getTestTemplates(activeTopic, selectedNodeId).map((template) => (
                  <button
                    type="button"
                    key={template.label}
                    disabled={disabled}
                    onClick={() => setInput(template.content)}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            )}
            <div className="skills-composer-actions">
              <span>{busy ? '外部 agent 运行中' : '本地文件是真相，画布是映射'}</span>
              <IconButton
                className="send-button"
                icon={<Send />}
                label="发送"
                disabled={disabled || !input.trim()}
                onClick={send}
              />
            </div>
          </div>
        </>
      )}
    </aside>
  )
}

function getKindLabel(kind: SkillLabMessage['kind']) {
  if (kind === 'analysis') return '解读'
  if (kind === 'suggestion') return '优化'
  if (kind === 'test') return '测试'
  return '提问'
}

function getPlaceholder(kind: SkillMessageKind) {
  if (kind === 'suggestion') return '例如：帮我找出这个 skill 的触发条件是否太宽'
  if (kind === 'test') return '例如：用一个应该触发该 skill 的请求跑一次测试'
  return '例如：这个 skill 会在什么时候触发？'
}

function getTestTemplates(activeTopic?: SkillTopic, selectedNodeId?: string) {
  const skillName = activeTopic?.graph?.skill.name ?? activeTopic?.title ?? '这个 skill'
  const node = activeTopic?.graph?.nodes.find((item) => item.id === selectedNodeId)
  const nodeHint = node ? `，重点检查画布节点「${node.label}」` : ''

  return [
    {
      label: '应触发',
      content: `请设计并运行一个应该触发 ${skillName} 的测试请求${nodeHint}，说明触发依据、读取了哪些文件、结果是否通过。`,
    },
    {
      label: '边界不触发',
      content: `请设计一个相近但不应该触发 ${skillName} 的反例测试，检查触发边界是否清楚；如果失败，请指出对应画布节点。`,
    },
    {
      label: '引用文件',
      content: `请检查 ${skillName} 在执行时是否会读取正确的 reference/assets/scripts 文件${nodeHint}，列出证据、遗漏和失败原因。`,
    },
  ]
}

function getMessageNodeLabel(activeTopic: SkillTopic | undefined, nodeId: string) {
  return activeTopic?.graph?.nodes.find((node) => node.id === nodeId)?.label ?? nodeId
}
