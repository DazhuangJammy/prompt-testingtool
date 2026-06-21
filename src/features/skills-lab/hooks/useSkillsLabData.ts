import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import { db } from '@/shared/storage/db'

const ACTIVE_SKILL_TOPIC_KEY = 'prompt-canvas.active-skill-topic'

export function useSkillsLabData() {
  const topics = useLiveQuery(() => skillsLabRepository.listTopics(), [], undefined)
  const settings = useLiveQuery(
    () => skillsLabRepository.getSettings(),
    [],
    undefined,
  )
  const [activeTopicId, setActiveTopicIdState] = useState<string | undefined>(() => {
    return localStorage.getItem(ACTIVE_SKILL_TOPIC_KEY) || undefined
  })
  const effectiveTopicId = useMemo(() => {
    if (!topics?.length) return undefined
    if (topics.some((topic) => topic.id === activeTopicId)) return activeTopicId
    return topics[0]?.id
  }, [activeTopicId, topics])
  const activeTopic = topics?.find((topic) => topic.id === effectiveTopicId)
  const messages = useLiveQuery(
    () =>
      effectiveTopicId
        ? skillsLabRepository.listMessages(effectiveTopicId)
        : Promise.resolve([]),
    [effectiveTopicId],
    [],
  )

  useEffect(() => {
    void skillsLabRepository.ensureSettings().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (effectiveTopicId) localStorage.setItem(ACTIVE_SKILL_TOPIC_KEY, effectiveTopicId)
    else localStorage.removeItem(ACTIVE_SKILL_TOPIC_KEY)
  }, [effectiveTopicId])

  const setActiveTopicId = (topicId?: string) => {
    setActiveTopicIdState(topicId)
    if (topicId) localStorage.setItem(ACTIVE_SKILL_TOPIC_KEY, topicId)
    else localStorage.removeItem(ACTIVE_SKILL_TOPIC_KEY)
  }

  return {
    activeTopic,
    activeTopicId: effectiveTopicId,
    messages: messages ?? [],
    settings,
    setActiveTopicId,
    topics: topics ?? [],
    topicsLoaded: topics !== undefined,
  }
}

export async function hasAnySkillTopics() {
  return (await db.skillTopics.count()) > 0
}
