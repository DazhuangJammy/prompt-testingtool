import { GitCompare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { CompareRun, PromptCard } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface CompareBoxProps {
  busy: boolean
  cards: PromptCard[]
  disabled: boolean
  input: string
  leftCardId?: string
  latestCompare?: CompareRun
  rightCardId?: string
  onChange: (value: string) => void
  onLeftCardChange: (id: string) => void
  onRun: () => void
  onRightCardChange: (id: string) => void
}

export function CompareBox({
  busy,
  cards,
  disabled,
  input,
  leftCardId,
  latestCompare,
  rightCardId,
  onChange,
  onLeftCardChange,
  onRun,
  onRightCardChange,
}: CompareBoxProps) {
  return (
    <div className="compare-box">
      <div className="compare-head">
        <select
          aria-label="卡片 1"
          value={leftCardId ?? ''}
          onChange={(event) => onLeftCardChange(event.target.value)}
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.title}
            </option>
          ))}
        </select>
        <select
          aria-label="卡片 2"
          value={rightCardId ?? ''}
          onChange={(event) => onRightCardChange(event.target.value)}
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.title}
            </option>
          ))}
        </select>
        <IconButton
          icon={<GitCompare />}
          label="运行"
          disabled={busy || disabled || leftCardId === rightCardId}
          onClick={onRun}
        />
      </div>
      <textarea
        value={input}
        placeholder="同输入"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (!busy && !disabled && leftCardId !== rightCardId) onRun()
          }
        }}
      />
      {latestCompare && (
        <div className="compare-result">
          <article>
            <ReactMarkdown>{latestCompare.oldOutput}</ReactMarkdown>
          </article>
          <article>
            <ReactMarkdown>{latestCompare.newOutput}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  )
}
