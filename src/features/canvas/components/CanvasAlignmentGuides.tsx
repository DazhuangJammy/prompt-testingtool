import type { CanvasAlignmentGuide } from '@/features/canvas/model/canvasAlignment'

interface CanvasAlignmentGuidesProps {
  guides: CanvasAlignmentGuide[]
}

export function CanvasAlignmentGuides({ guides }: CanvasAlignmentGuidesProps) {
  if (!guides.length) return null

  return (
    <div className="canvas-alignment-guides" aria-hidden="true">
      {guides.map((guide) => (
        <div
          className={`canvas-alignment-guide is-${guide.axis}`}
          key={guide.id}
          style={
            guide.axis === 'x'
              ? {
                  height: guide.to - guide.from,
                  left: guide.position,
                  top: guide.from,
                }
              : {
                  left: guide.from,
                  top: guide.position,
                  width: guide.to - guide.from,
                }
          }
        />
      ))}
    </div>
  )
}
