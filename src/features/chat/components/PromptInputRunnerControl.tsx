import { useMemo, useState } from 'react'
import {
  resolvePromptInputSource,
  type PromptInputSource,
} from '@/features/input-card/model/inputCard'
import { InputSourceRunner } from './InputSourceRunner'

interface PromptInputRunnerControlProps {
  busy: boolean
  sources: PromptInputSource[]
  onRun: (source: PromptInputSource, startSegmentId?: string) => Promise<void> | void
}

export function PromptInputRunnerControl({
  busy,
  sources,
  onRun,
}: PromptInputRunnerControlProps) {
  const [running, setRunning] = useState(false)
  const [selectedInputCardId, setSelectedInputCardId] = useState<string>()
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>()
  const activeInputSource = useMemo(
    () => resolvePromptInputSource(sources, selectedInputCardId),
    [sources, selectedInputCardId],
  )
  const effectiveSegmentId = activeInputSource?.segments.some(
    (segment) => segment.id === selectedSegmentId && segment.content.trim(),
  )
    ? selectedSegmentId
    : activeInputSource?.segments.find((segment) => segment.content.trim())?.id

  return (
    <InputSourceRunner
      busy={busy || running}
      selectedInputCardId={activeInputSource?.inputCard.id}
      selectedSegmentId={effectiveSegmentId}
      sources={sources}
      onInputCardChange={(id) => {
        setSelectedInputCardId(id)
        const nextSource = sources.find((source) => source.inputCard.id === id)
        setSelectedSegmentId(
          nextSource?.segments.find((segment) => segment.content.trim())?.id,
        )
      }}
      onRun={() => {
        if (!activeInputSource) return
        setRunning(true)
        void Promise.resolve(onRun(activeInputSource, effectiveSegmentId)).finally(
          () => setRunning(false),
        )
      }}
      onSegmentChange={setSelectedSegmentId}
    />
  )
}
