import type { ChatTopicExportPayload, ExportPayload } from '@/shared/types'

export function isSupportedWorkspacePayloadVersion(
  version: ExportPayload['version'] | number,
) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(version)
}

export function createTopicImportIdMap(payload: ChatTopicExportPayload) {
  const sessions = new Map([
    [payload.chatSession.id, crypto.randomUUID()],
    ...(payload.childChatSessions ?? []).map(
      (session) => [session.id, crypto.randomUUID()] as const,
    ),
  ])
  const promptCards = new Map(
    payload.promptCards.map((card) => [card.id, crypto.randomUUID()]),
  )
  const nodes = new Map<string, string>([
    ...payload.promptCards.map((card) => [card.id, promptCards.get(card.id)!] as const),
    ...(payload.inputCards ?? []).map(
      (card) => [card.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasShapeNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasImageNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasStrokes ?? []).map(
      (stroke) => [stroke.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasTextNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
  ])

  return {
    promptCards,
    nodes,
    edges: new Map(
      (payload.canvasEdges ?? []).map((edge) => [edge.id, crypto.randomUUID()]),
    ),
    promptVersions: new Map(
      payload.promptVersions.map((version) => [version.id, crypto.randomUUID()]),
    ),
    sessions,
    messages: new Map(
      payload.chatMessages.map((message) => [message.id, crypto.randomUUID()]),
    ),
    compareRuns: new Map(
      payload.compareRuns.map((run) => [run.id, crypto.randomUUID()]),
    ),
  }
}

export function mapOptionalId(id: string | undefined, map: Map<string, string>) {
  return id ? map.get(id) : undefined
}

export function mapRequiredId(id: string, map: Map<string, string>) {
  return map.get(id) ?? id
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export function cloneChatMessageAttachments(
  attachments: ChatTopicExportPayload['chatMessages'][number]['attachments'],
) {
  return attachments?.map((attachment) => ({
    ...attachment,
    id: crypto.randomUUID(),
  }))
}
