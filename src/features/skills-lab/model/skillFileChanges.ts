import type {
  SkillFileChangeSummary,
  SkillFileStatus,
  SkillFileStatusItem,
} from '@/shared/types'

export function summarizeSkillFileChanges(
  before?: SkillFileStatus,
  after?: SkillFileStatus,
): SkillFileChangeSummary {
  const beforeFiles = toFileMap(before?.files ?? [])
  const afterFiles = toFileMap(after?.files ?? [])
  const added: string[] = []
  const modified: string[] = []
  const removed: string[] = []

  for (const [path, file] of afterFiles) {
    const previous = beforeFiles.get(path)
    if (!previous) {
      added.push(path)
    } else if (previous.size !== file.size || previous.mtimeMs !== file.mtimeMs) {
      modified.push(path)
    }
  }

  for (const path of beforeFiles.keys()) {
    if (!afterFiles.has(path)) removed.push(path)
  }

  return {
    added: added.sort(),
    modified: modified.sort(),
    removed: removed.sort(),
  }
}

export function hasSkillFileChanges(summary: SkillFileChangeSummary) {
  return Boolean(summary.added.length || summary.modified.length || summary.removed.length)
}

export function formatSkillFileChangeSummary(summary: SkillFileChangeSummary) {
  const lines = ['检测到外部 agent 修改了本地 skill 文件，已重新解读并刷新画布。']
  lines.push(...formatGroup('新增', summary.added))
  lines.push(...formatGroup('修改', summary.modified))
  lines.push(...formatGroup('删除', summary.removed))
  return lines.join('\n')
}

function toFileMap(files: SkillFileStatusItem[]) {
  return new Map(files.map((file) => [file.path, file]))
}

function formatGroup(label: string, files: string[]) {
  if (!files.length) return []
  const shown = files.slice(0, 6).join('、')
  const hiddenCount = files.length - 6
  const suffix = hiddenCount > 0 ? `，另有 ${hiddenCount} 个文件` : ''
  return [`- ${label}：${shown}${suffix}`]
}
