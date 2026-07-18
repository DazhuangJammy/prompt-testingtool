import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { BailianKnowledgeConnection } from '@/shared/knowledge.types'
import type { KnowledgeBase, KnowledgeRagConfig } from '@/shared/types'
import { DialogShell } from './KnowledgeDialogs'

const BAILIAN_CONSOLE_URL =
  'https://bailian.console.aliyun.com/cn-beijing?tab=app#/knowledge-base'

export interface BailianSettingsInput {
  name: string
  externalBaseId: string
  bailian: BailianKnowledgeConnection
  config: KnowledgeRagConfig
}

export function BailianKnowledgeSettingsDialog({
  base,
  busy,
  onClose,
  onSave,
}: {
  base: KnowledgeBase
  busy: boolean
  onClose: () => void
  onSave: (input: BailianSettingsInput) => void
}) {
  const [name, setName] = useState(base.name)
  const [externalBaseId, setExternalBaseId] = useState(base.externalBaseId ?? '')
  const [connection, setConnection] = useState<BailianKnowledgeConnection>({
    accessKeyId: base.bailian?.accessKeyId ?? '',
    accessKeySecret: base.bailian?.accessKeySecret ?? '',
    workspaceId: base.bailian?.workspaceId ?? '',
  })
  const [config, setConfig] = useState(base.config)
  const complete = Boolean(
    externalBaseId.trim() &&
    connection.accessKeyId.trim() &&
    connection.accessKeySecret.trim() &&
    connection.workspaceId.trim(),
  )

  return (
    <DialogShell title="阿里百炼设置" onClose={onClose}>
      <div className="knowledge-settings-toolbar">
        <button
          type="button"
          onClick={() => window.open(BAILIAN_CONSOLE_URL, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink />
          百炼控制台
        </button>
      </div>
      <label>
        显示名称
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        知识库 ID
        <input value={externalBaseId} onChange={(event) => setExternalBaseId(event.target.value)} />
      </label>
      <label>
        业务空间 ID
        <input
          value={connection.workspaceId}
          onChange={(event) => setConnection((current) => ({
            ...current,
            workspaceId: event.target.value,
          }))}
        />
      </label>
      <label>
        AccessKey ID
        <input
          value={connection.accessKeyId}
          autoComplete="off"
          onChange={(event) => setConnection((current) => ({
            ...current,
            accessKeyId: event.target.value,
          }))}
        />
      </label>
      <label>
        AccessKey Secret
        <input
          type="password"
          value={connection.accessKeySecret}
          autoComplete="new-password"
          onChange={(event) => setConnection((current) => ({
            ...current,
            accessKeySecret: event.target.value,
          }))}
        />
      </label>
      <NumberField
        label="召回数量"
        value={config.topK}
        onChange={(topK) => setConfig((current) => ({ ...current, topK }))}
      />
      <NumberField
        label="相似度阈值"
        step={0.01}
        value={config.threshold}
        onChange={(threshold) => setConfig((current) => ({ ...current, threshold }))}
      />
      <label className="knowledge-checkbox">
        <input
          type="checkbox"
          checked={config.rerankEnabled}
          onChange={(event) => setConfig((current) => ({
            ...current,
            rerankEnabled: event.target.checked,
          }))}
        />
        启用重排
      </label>
      <div className="knowledge-dialog-actions">
        <button type="button" onClick={onClose}>取消</button>
        <button
          type="button"
          disabled={busy || !complete}
          onClick={() => onSave({
            name,
            externalBaseId,
            bailian: connection,
            config,
          })}
        >
          {busy ? '连接中' : '保存并连接'}
        </button>
      </div>
    </DialogShell>
  )
}

function NumberField({
  label,
  onChange,
  step = 1,
  value,
}: {
  label: string
  value: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
