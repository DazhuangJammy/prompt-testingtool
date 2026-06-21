import { FolderSearch, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  listLocalSkills,
  pickLocalSkillFolder,
} from '@/features/skills-lab/infrastructure/localSkillAgentClient'
import type { SkillsLabSettings } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface SkillPathDialogProps {
  open: boolean
  settings?: SkillsLabSettings
  onClose: () => void
  onSelect: (skillPath: string) => void
}

export function SkillPathDialog({
  open,
  settings,
  onClose,
  onSelect,
}: SkillPathDialogProps) {
  const [path, setPath] = useState('')
  const [skills, setSkills] = useState<
    Array<{ name: string; path: string; hasSkillMarkdown: boolean }>
  >([])
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const [scanningDirectory, setScanningDirectory] = useState('')

  useEffect(() => {
    if (!open || !settings?.defaultSkillsDirectory) return
    const directory = settings.defaultSkillsDirectory
    listLocalSkills(settings.defaultSkillsDirectory)
      .then((nextSkills) => {
        setSkills(nextSkills)
        setScanningDirectory(directory)
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : '扫描失败')
      })
  }, [open, settings?.defaultSkillsDirectory])

  if (!open) return null

  const submitPath = (skillPath: string) => {
    const trimmed = skillPath.trim()
    if (!trimmed) {
      setError('请输入本地 skill 文件夹路径')
      return
    }
    onSelect(trimmed)
    close()
  }

  const close = () => {
    setPath('')
    setError('')
    setPicking(false)
    setScanningDirectory('')
    setSkills([])
    onClose()
  }

  const pickFolder = () => {
    setPicking(true)
    setError('')
    void pickLocalSkillFolder()
      .then((selectedPath) => {
        if (selectedPath) setPath(selectedPath)
      })
      .catch((nextError: unknown) => {
        const message = nextError instanceof Error ? nextError.message : '选择失败'
        if (message !== '已取消选择文件夹') setError(message)
      })
      .finally(() => setPicking(false))
  }

  return (
    <div className="dialog-backdrop">
      <section className="skill-path-dialog">
        <div className="dialog-head">
          <span>选择 Skill</span>
          <IconButton icon={<X />} label="关闭" onClick={close} />
        </div>
        <div className="skill-path-body">
          <label className="settings-field">
            <span>
              <FolderSearch size={16} />
              本地 Skill 文件夹
            </span>
            <input
              value={path}
              placeholder="/Users/you/.codex/skills/my-skill"
              onChange={(event) => setPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitPath(path)
              }}
            />
            <small>可以弹出系统文件夹选择器，也可以手动输入路径或从默认目录列表选择。</small>
          </label>
          <div className="skill-path-actions">
            <button type="button" disabled={picking} onClick={pickFolder}>
              {picking ? '选择中' : '选择本地文件夹'}
            </button>
          </div>

          {settings?.defaultSkillsDirectory && (
            <div className="skill-directory-list">
              <div className="skill-directory-head">
                <span>默认目录</span>
                <small>{settings.defaultSkillsDirectory}</small>
              </div>
              {settings.defaultSkillsDirectory && scanningDirectory !== settings.defaultSkillsDirectory ? (
                <p>正在扫描...</p>
              ) : skills.length ? (
                skills.map((skill) => (
                  <button
                    type="button"
                    key={skill.path}
                    onClick={() => submitPath(skill.path)}
                  >
                    <span>{skill.name}</span>
                    <small>{skill.path}</small>
                  </button>
                ))
              ) : (
                <p>没有发现包含 SKILL.md 的目录。</p>
              )}
            </div>
          )}

          {error && <div className="error-line">{error}</div>}

          <div className="provider-detail-actions">
            <button type="button" onClick={() => submitPath(path)}>
              绑定 Skill
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
