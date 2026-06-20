import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import {
  collectMarkdownOutlineNodeIds,
  type MarkdownOutlineNode,
} from '@/features/prompt-card/model/prompt'

interface UseDefaultCollapsedHeadingsInput {
  cardId: string
  defaultCollapsed?: boolean
  generating: boolean
  nodes: MarkdownOutlineNode[]
  setCollapsedHeadingIds: Dispatch<SetStateAction<Set<string>>>
}

export function useDefaultCollapsedHeadings({
  cardId,
  defaultCollapsed,
  generating,
  nodes,
  setCollapsedHeadingIds,
}: UseDefaultCollapsedHeadingsInput) {
  const appliedCardIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!defaultCollapsed || generating || appliedCardIdRef.current === cardId) return

    const headingIds = collectMarkdownOutlineNodeIds(nodes)
    if (!headingIds.length) return

    setCollapsedHeadingIds(new Set(headingIds))
    appliedCardIdRef.current = cardId
  }, [cardId, defaultCollapsed, generating, nodes, setCollapsedHeadingIds])
}
