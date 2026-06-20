import { Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface FlowchartGenerationDialogProps {
  error?: string
  generating: boolean
  open: boolean
  onClose: () => void
  onSubmit: (instruction: string) => void
}

export function FlowchartGenerationDialog({
  error,
  generating,
  open,
  onClose,
  onSubmit,
}: FlowchartGenerationDialogProps) {
  const [instruction, setInstruction] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [open])

  if (!open) return null

  return (
    <div className="flowchart-generator-backdrop">
      <form
        className="flowchart-generator-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(instruction)
        }}
      >
        <div className="flowchart-generator-head">
          <div>
            <span>
              <Sparkles size={17} />
              AI 生成流程图
            </span>
            <p>输入流程目标，自动生成步骤、提示词节点和清晰连线。</p>
          </div>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <textarea
          ref={textareaRef}
          value={instruction}
          placeholder="例如：帮我生成一个从用户需求到 SVG 输出的自动化流程"
          disabled={generating}
          onChange={(event) => setInstruction(event.target.value)}
        />

        {error && <div className="flowchart-generator-error">{error}</div>}

        <div className="flowchart-generator-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={generating || !instruction.trim()}
          >
            <Sparkles size={16} className={generating ? 'is-spinning' : undefined} />
            生成
          </button>
        </div>
      </form>
    </div>
  )
}
