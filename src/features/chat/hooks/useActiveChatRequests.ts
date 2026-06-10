import { useRef, useState } from 'react'
import type { ActiveRequest } from '@/features/chat/model/comparePanes'

export function useActiveChatRequests() {
  const abortControllersRef = useRef<
    Partial<Record<ActiveRequest, AbortController>>
  >({})
  const [activeRequests, setActiveRequests] = useState<
    Partial<Record<ActiveRequest, boolean>>
  >({})

  const setRequestActive = (key: ActiveRequest, active: boolean) => {
    setActiveRequests((current) => {
      const next = { ...current }
      if (active) next[key] = true
      else delete next[key]
      return next
    })
  }

  const startRequest = (key: ActiveRequest) => {
    const controller = new AbortController()
    abortControllersRef.current[key] = controller
    setRequestActive(key, true)
    return controller
  }

  const finishRequest = (key: ActiveRequest, controller: AbortController) => {
    if (abortControllersRef.current[key] === controller) {
      delete abortControllersRef.current[key]
    }
    setRequestActive(key, false)
  }

  const stopGeneration = (key?: ActiveRequest) => {
    if (key) {
      abortControllersRef.current[key]?.abort()
      return
    }
    Object.values(abortControllersRef.current).forEach((controller) =>
      controller?.abort(),
    )
  }

  const isRequestActive = (key: ActiveRequest) => Boolean(activeRequests[key])
  const activeRequest = Object.entries(activeRequests).find(
    ([, active]) => active,
  )?.[0] as ActiveRequest | undefined

  return {
    activeRequest,
    busy: Object.values(activeRequests).some(Boolean),
    finishRequest,
    isRequestActive,
    startRequest,
    stopGeneration,
  }
}
