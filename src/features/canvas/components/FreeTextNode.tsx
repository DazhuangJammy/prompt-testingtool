import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react'
import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { CanvasTextFlowNode } from '@/features/canvas/model/flowTypes'

function FreeTextNode({ data }: NodeProps<CanvasTextFlowNode>) {
  const { node, onSelect, onUpdate, selectedNodeId } = data
  const [editing, setEditing] = useState(false)
  const [textDraft, setTextDraft] = useState(node.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSelected = selectedNodeId === node.id

  useEffect(() => {
    if (!editing) return
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [editing])

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

  const startEditing = () => {
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
        color="var(--ok)"
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
          onChange={(event) => setTextDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="free-text-drag-area">{node.text}</div>
      )}
    </div>
  )
}

export default memo(FreeTextNode)
