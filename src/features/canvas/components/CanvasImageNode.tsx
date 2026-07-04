import {
  Download,
  Eye,
} from 'lucide-react'
import {
  Handle,
  NodeResizeControl,
  Position,
  type NodeProps,
  type ResizeParams,
} from '@xyflow/react'
import { memo, useEffect, useState } from 'react'
import { ImagePreviewDialog } from '@/shared/ui/ImagePreviewDialog'
import { IconButton } from '@/shared/ui/IconButton'
import type { CanvasImageFlowNode } from '@/features/canvas/model/flowTypes'

const resizePositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

function CanvasImageNode({ data }: NodeProps<CanvasImageFlowNode>) {
  const { node, onSelect, onUpdate, selectedNodeId } = data
  const [hovering, setHovering] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const isSelected = selectedNodeId === node.id
  const showControls = hovering || isSelected

  useEffect(() => {
    if (!previewOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewOpen])

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

  return (
    <>
      <section
        className={`canvas-image-node ${isSelected ? 'is-selected' : ''} ${
          hovering ? 'is-hovered' : ''
        }`}
        onClick={(event) => onSelect(node.id, event)}
        onPointerDownCapture={(event) => onSelect(node.id, event)}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        {showControls &&
          resizePositions.map((position) => (
            <NodeResizeControl
              key={position}
              autoScale
              className="canvas-image-resize-handle nodrag"
              color="var(--accent)"
              minHeight={72}
              minWidth={96}
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

        <div className="canvas-image-drag-area">
          <img src={node.dataUrl} alt={node.name} draggable={false} />
        </div>
        {showControls && (
          <div className="canvas-image-actions nodrag nopan">
            <IconButton
              icon={<Eye />}
              label="预览"
              onClick={() => setPreviewOpen(true)}
            />
            <IconButton
              icon={<Download />}
              label="下载"
              onClick={() => downloadImage(node.dataUrl, node.name)}
            />
          </div>
        )}
      </section>
      {previewOpen && (
        <ImagePreviewDialog
          name={node.name}
          src={node.dataUrl}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  )
}

function downloadImage(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export default memo(CanvasImageNode)
