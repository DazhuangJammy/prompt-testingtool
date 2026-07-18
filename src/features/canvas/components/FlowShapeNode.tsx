import {
  Handle,
  NodeResizeControl,
  Position,
  type NodeProps,
  type ResizeParams,
} from '@xyflow/react'
import type { CSSProperties, FocusEvent, MouseEvent, WheelEvent } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  isFocusLeavingContainer,
  isTargetOutsideContainer,
} from '@/features/canvas/components/editorFocus'
import type { CanvasShapeFlowNode } from '@/features/canvas/model/flowTypes'
import { resolveCanvasNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import {
  getTextOffsetFromPoint,
  placeTextControlCaret,
} from '@/shared/ui/textCaret'

const resizePositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

function FlowShapeNode({ data }: NodeProps<CanvasShapeFlowNode>) {
  const { node, onSelect, onUpdate, selectedNodeId } = data
  const bodyPlaceholder = node.kind === 'decision' ? '分支条件' : '流程说明'
  const nodeBody = resolveEditableBody(node.body, bodyPlaceholder)
  const [editing, setEditing] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [bodyDraft, setBodyDraft] = useState(nodeBody)
  const pendingCursorOffsetRef = useRef<number | undefined>(undefined)
  const editorRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const isSelected = selectedNodeId === node.id
  const frameStyle = resolveCanvasNodeFrameStyle(node.frameStyle)
  const nodeStyle = node.frameStyle?.borderColor
    ? ({ '--node-frame-color': frameStyle.borderColor } as CSSProperties)
    : undefined

  const saveDraft = useCallback(() => {
    const body = normalizeManualFlowBody(bodyRef.current?.value ?? bodyDraft)
    onUpdate(node.id, { body })
    setBodyDraft(body)
    setEditing(false)
  }, [bodyDraft, node.id, onUpdate])

  useEffect(() => {
    if (!editing) return
    const target = bodyRef.current
    if (!target) return

    window.requestAnimationFrame(() => {
      placeTextControlCaret(target, pendingCursorOffsetRef.current)
      pendingCursorOffsetRef.current = undefined
    })
  }, [editing])

  useEffect(() => {
    if (!editing) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const editor = editorRef.current
      if (editor && isTargetOutsideContainer(editor, event.target)) saveDraft()
    }

    window.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () =>
      window.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [editing, saveDraft])

  const cancelDraft = () => {
    setBodyDraft(nodeBody)
    setEditing(false)
  }

  const startEditing = (event: MouseEvent<HTMLElement>) => {
    const bodyTarget = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('.flow-shape-body')
      : undefined
    pendingCursorOffsetRef.current = bodyTarget
      ? getTextOffsetFromPoint(bodyTarget, event.clientX, event.clientY)
      : undefined
    setBodyDraft(nodeBody)
    setEditing(true)
  }

  const saveSize = (_event: unknown, params: ResizeParams) => {
    onUpdate(node.id, {
      height: Math.round(params.height),
      position: {
        x: Math.round(params.x),
        y: Math.round(params.y),
      },
      width: Math.round(params.width),
    })
  }

  const handleEditorBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isFocusLeavingContainer(event.currentTarget, event.relatedTarget)) {
      saveDraft()
    }
  }

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!isSelected) return

    const body = event.currentTarget.querySelector<HTMLElement>('.flow-shape-body')
    if (!body) return

    const canScrollY = body.scrollHeight > body.clientHeight
    const canScrollX = body.scrollWidth > body.clientWidth
    if (!canScrollY && !canScrollX) return

    event.stopPropagation()

    const target = event.target
    if (target instanceof Node && body.contains(target)) return

    event.preventDefault()
    if (canScrollY) body.scrollTop += event.deltaY
    if (canScrollX) body.scrollLeft += event.deltaX
  }

  return (
    <section
      className={`flow-shape flow-shape-${node.kind} ${
        isSelected ? 'is-selected' : ''
      } ${hovering ? 'is-hovered' : ''} ${
        frameStyle.highlighted ? 'is-highlighted' : ''
      }`}
      style={nodeStyle}
      onClick={(event) => onSelect(node.id, event)}
      onDoubleClick={startEditing}
      onPointerDownCapture={(event) => onSelect(node.id, event)}
      onWheelCapture={handleWheel}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {(isSelected || hovering) &&
        resizePositions.map((position) => (
          <NodeResizeControl
            key={position}
            autoScale
            className="flow-shape-resize-handle nodrag"
            color="var(--accent)"
            minHeight={72}
            minWidth={120}
            position={position}
            onResizeEnd={saveSize}
          />
        ))}
      <Handle
        id="top"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Top}
        type="source"
      />
      <Handle
        id="left"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Left}
        type="source"
      />
      <Handle
        id="right"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Right}
        type="source"
      />
      <Handle
        id="bottom"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Bottom}
        type="source"
      />

      {editing ? (
        <div
          ref={editorRef}
          className="flow-shape-editor nodrag nopan nowheel"
          onBlur={handleEditorBlur}
        >
          <textarea
            ref={bodyRef}
            aria-label={node.kind === 'decision' ? '编辑判断条件' : '编辑步骤内容'}
            placeholder={bodyPlaceholder}
            value={bodyDraft}
            onChange={(event) => setBodyDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelDraft()
            }}
          />
        </div>
      ) : (
        <div className={`flow-shape-drag-area flow-shape-${node.kind}-content`}>
          <div className="flow-shape-body markdown-preview nowheel">
            {nodeBody ? (
              <MarkdownRenderer preserveLineBreaks protectSpecialBlockHeadings>
                {nodeBody}
              </MarkdownRenderer>
            ) : (
              <span className="flow-shape-body-placeholder">{bodyPlaceholder}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default memo(FlowShapeNode)

function normalizeManualFlowBody(value: string) {
  return value.replace(/\r\n?/g, '\n').trim()
}

function resolveEditableBody(value: string, placeholder: string) {
  return value.trim() === placeholder ? '' : value
}
