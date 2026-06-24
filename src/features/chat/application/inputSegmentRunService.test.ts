import { describe, expect, it, vi } from 'vitest'
import {
  resolveRunnableInputSegments,
  runInputSegmentSequence,
} from './inputSegmentRunService'
import type { InputSegment } from '@/features/input-card/model/inputCard'

const segments: InputSegment[] = [
  { id: 'one', title: '一', content: '正文一', order: 0 },
  { id: 'empty', title: '空', content: '   ', order: 1 },
  { id: 'two', title: '二', content: '正文二', order: 2 },
]

describe('input segment run service', () => {
  it('resolves runnable input segments from the selected segment', () => {
    expect(resolveRunnableInputSegments(segments, 'empty')).toEqual([
      segments[2],
    ])
    expect(resolveRunnableInputSegments(segments, 'missing')).toEqual([
      segments[0],
      segments[2],
    ])
  })

  it('runs prepared segments in sequence until a send stops', async () => {
    const prepareContexts = vi.fn(async () => ({
      knowledge: { context: '', references: [] },
      webSearch: { context: '', references: [] },
    }))
    const sendSegment = vi
      .fn()
      .mockResolvedValueOnce({ completed: true, sessionId: 'session-1' })
      .mockResolvedValueOnce({ completed: false, sessionId: 'session-1' })
    const onSessionChange = vi.fn()

    await runInputSegmentSequence({
      segments: [segments[0], segments[2]],
      prepareContexts,
      sendSegment,
      onSessionChange,
    })

    expect(prepareContexts).toHaveBeenCalledTimes(2)
    expect(sendSegment).toHaveBeenCalledTimes(2)
    expect(onSessionChange).toHaveBeenCalledTimes(2)
  })
})
