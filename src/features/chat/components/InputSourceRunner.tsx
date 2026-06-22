import { Play } from 'lucide-react'
import type { PromptInputSource } from '@/features/input-card/model/inputCard'
import { IconButton } from '@/shared/ui/IconButton'

interface InputSourceRunnerProps {
  busy: boolean
  selectedInputCardId?: string
  selectedSegmentId?: string
  sources: PromptInputSource[]
  onInputCardChange: (id: string) => void
  onRun: () => void
  onSegmentChange: (id: string) => void
}

export function InputSourceRunner({
  busy,
  selectedInputCardId,
  selectedSegmentId,
  sources,
  onInputCardChange,
  onRun,
  onSegmentChange,
}: InputSourceRunnerProps) {
  if (!sources.length) return null

  const source =
    sources.find((item) => item.inputCard.id === selectedInputCardId) ?? sources[0]
  const runnableSegments = source.segments.filter((segment) => segment.content.trim())
  const runDisabled = busy || !runnableSegments.length

  return (
    <div className="input-source-runner">
      {sources.length > 1 && (
        <select
          aria-label="输入卡片"
          value={source.inputCard.id}
          onChange={(event) => onInputCardChange(event.target.value)}
        >
          {sources.map((item) => (
            <option key={item.inputCard.id} value={item.inputCard.id}>
              {item.inputCard.title}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="起始输入"
        value={selectedSegmentId ?? runnableSegments[0]?.id ?? ''}
        disabled={!runnableSegments.length}
        onChange={(event) => onSegmentChange(event.target.value)}
      >
        {!runnableSegments.length && <option value="">没有正文</option>}
        {runnableSegments.map((segment) => (
          <option key={segment.id} value={segment.id}>
            {segment.title}
          </option>
        ))}
      </select>
      <IconButton
        icon={<Play />}
        label="运行输入"
        disabled={runDisabled}
        onClick={onRun}
      />
    </div>
  )
}
