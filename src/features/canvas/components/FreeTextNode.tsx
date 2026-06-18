import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react'
import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import type { CanvasTextFlowNode } from '@/features/canvas/model/flowTypes'
import {
  getTextOffsetFromPoint,
  placeTextControlCaret,
  resizeTextAreaToContent,
} from '@/shared/ui/textCaret'

function FreeTextNode({ data }: NodeProps<CanvasTextFlowNode>) {
  const { node, onSelect, onUpdate, selectedNodeId } = data
  const [editing, setEditing] = useState(false)
  const [textDraft, setTextDraft] = useState(node.text)
  const pendingCursorOffsetRef = useRef<number | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewHeightRef = useRef(22)
  const isSelected = selectedNodeId === node.id

  useEffect(() => {
    if (!editing) return
    const textarea = textareaRef.current
    if (!textarea) return
    window.requestAnimationFrame(() => {
      resizeTextAreaToContent(textarea, {
        minHeight: previewHeightRef.current,
      })
      placeTextControlCaret(textarea, pendingCursorOffsetRef.current)
      pendingCursorOffsetRef.current = undefined
    })
  }, [editing])

  useEffect(() => {
    if (!editing) return
    const textarea = textareaRef.current
    if (!textarea) return
    window.requestAnimationFrame(() => {
      resizeTextAreaToContent(textarea, {
        minHeight: previewHeightRef.current,
      })
    })
  }, [editing, textDraft])

  const commit = () => {
    const text = textDraft.trim() || node.text
    onUpdate(node.id, { text })
    setTextDraft(text)
    setEditing(false)
  }

  const cancel = () => {
    setTextDraft(node.text)
    setEditing(false)
  }

  const startEditing = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('.free-text-drag-area')
      : undefined
    pendingCursorOffsetRef.current = target
      ? getTextOffsetFromPoint(target, event.clientX, event.clientY)
      : undefined
    previewHeightRef.current = getPreviewHeight(previewRef.current)
    setTextDraft(node.text)
    setEditing(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
  }

  const saveWidth = (_event: unknown, params: ResizeParams) => {
    onUpdate(node.id, {
      position: {
        x: Math.round(params.x),
        y: Math.round(params.y),
      },
      width: Math.round(params.width),
    })
  }

  const style = {
    '--free-text-bg': node.backgroundColor,
    '--free-text-color': node.color,
    '--free-text-size': `${node.fontSize}px`,
  } as CSSProperties

  return (
    <div
      className={`free-text-node ${isSelected ? 'is-selected' : ''}`}
      style={style}
      onClick={() => onSelect(node.id)}
      onDoubleClick={startEditing}
    >
      <NodeResizer
        autoScale
        color="var(--accent)"
        handleClassName="free-text-resize-handle nodrag"
        isVisible={isSelected}
        lineClassName="free-text-resize-line nodrag"
        minHeight={24}
        minWidth={80}
        onResizeEnd={saveWidth}
      />
      {editing ? (
        <textarea
          ref={textareaRef}
          className="free-text-editor nodrag nopan nowheel"
          value={textDraft}
          onBlur={commit}
          onChange={(event) => {
            setTextDraft(event.target.value)
            resizeTextAreaToContent(event.currentTarget, {
              minHeight: previewHeightRef.current,
            })
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => event.stopPropagation()}
        />
      ) : (
        <div ref={previewRef} className="free-text-drag-area">
          {node.text}
        </div>
      )}
    </div>
  )
}

function getPreviewHeight(preview: HTMLElement | null) {
  return Math.max(22, preview?.offsetHeight ?? 22)
}

export default memo(FreeTextNode)
