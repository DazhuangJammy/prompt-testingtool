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
import { normalizeFlowBody } from '@/features/canvas/model/generatedFlowchartLayout'
import { resolveCanvasNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import {
  getTextOffsetFromPoint,
  placeTextControlCaret,
} from '@/shared/ui/textCaret'

const resizePositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

function FlowShapeNode({ data }: NodeProps<CanvasShapeFlowNode>) {
  const { node, onSelect, onUpdate, selectedNodeId } = data
  const [editing, setEditing] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.title)
  const [bodyDraft, setBodyDraft] = useState(node.body)
  const pendingFocusRef = useRef<'title' | 'body'>('title')
  const pendingCursorOffsetRef = useRef<number | undefined>(undefined)
  const editorRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const isSelected = selectedNodeId === node.id
  const frameStyle = resolveCanvasNodeFrameStyle(node.frameStyle)
  const nodeStyle = node.frameStyle?.borderColor
    ? ({ '--node-frame-color': frameStyle.borderColor } as CSSProperties)
    : undefined

  const saveDraft = useCallback(() => {
    const title = (titleRef.current?.value ?? titleDraft).trim() || node.title
    const body = normalizeFlowBody((bodyRef.current?.value ?? bodyDraft).trim())
    onUpdate(node.id, {
      body,
      title,
    })
    setTitleDraft(title)
    setBodyDraft(body)
    setEditing(false)
  }, [bodyDraft, node.id, node.title, onUpdate, titleDraft])

  useEffect(() => {
    if (!editing) return
    const target =
      pendingFocusRef.current === 'body' ? bodyRef.current : titleRef.current
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
    setTitleDraft(node.title)
    setBodyDraft(node.body)
    setEditing(false)
  }

  const startEditing = (event: MouseEvent<HTMLElement>) => {
    const titleTarget = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('.flow-shape-head')
      : undefined
    const bodyTarget = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('.flow-shape-body')
      : undefined
    const focus = bodyTarget ? 'body' : 'title'
    pendingFocusRef.current = focus
    pendingCursorOffsetRef.current = getTextOffsetFromPoint(
      (focus === 'body' ? bodyTarget : titleTarget) ?? event.currentTarget,
      event.clientX,
      event.clientY,
    )
    setTitleDraft(node.title)
    setBodyDraft(node.body)
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
      onClick={() => onSelect(node.id)}
      onDoubleClick={startEditing}
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
          <input
            ref={titleRef}
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveDraft()
              if (event.key === 'Escape') cancelDraft()
            }}
          />
          <textarea
            ref={bodyRef}
            value={bodyDraft}
            onChange={(event) => setBodyDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelDraft()
            }}
          />
        </div>
      ) : (
        <div className={`flow-shape-drag-area flow-shape-${node.kind}-content`}>
          <div className="flow-shape-head">
            <span>{node.title}</span>
          </div>
          <div className="flow-shape-body markdown-preview nowheel">
            <MarkdownRenderer>{node.body}</MarkdownRenderer>
          </div>
        </div>
      )}
    </section>
  )
}

export default memo(FlowShapeNode)
