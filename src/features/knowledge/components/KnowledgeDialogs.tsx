import { X } from 'lucide-react'
import { useState } from 'react'
import type {
  KnowledgeBase,
  KnowledgeRagConfig,
  KnowledgeSearchResult,
  ProviderConfig,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import type { createKnowledgeService } from '../application/knowledgeService'
import { filterKnowledgeModelProviders } from '../model/knowledge'

export function CreateBaseDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <DialogShell title="新建知识库" onClose={onClose}>
      <input
        autoFocus
        value={name}
        placeholder="知识库名称"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="knowledge-dialog-actions">
        <button type="button" onClick={onClose}>取消</button>
        <button type="button" onClick={() => onCreate(name)}>创建</button>
      </div>
    </DialogShell>
  )
}

export function TextSourceDialog({
  kind,
  onClose,
  onSubmit,
  title,
}: {
  kind: 'note' | 'url' | 'website'
  title: string
  onClose: () => void
  onSubmit: (input: { title: string; text?: string; sourceUri?: string }) => void
}) {
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const isRemote = kind === 'url' || kind === 'website'
  return (
    <DialogShell title={title} onClose={onClose}>
      <input value={name} placeholder="标题" onChange={(event) => setName(event.target.value)} />
      {isRemote ? (
        <input
          value={body}
          placeholder={kind === 'website' ? 'sitemap.xml 地址' : '网页地址'}
          onChange={(event) => setBody(event.target.value)}
        />
      ) : (
        <textarea value={body} placeholder="笔记正文" onChange={(event) => setBody(event.target.value)} />
      )}
      <div className="knowledge-dialog-actions">
        <button type="button" onClick={onClose}>取消</button>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              title: name || body,
              text: isRemote ? undefined : body,
              sourceUri: isRemote ? body : undefined,
            })
          }
        >
          添加
        </button>
      </div>
    </DialogShell>
  )
}

export function KnowledgeSettingsDialog({
  base,
  onClose,
  onSave,
  providers,
}: {
  base: KnowledgeBase
  providers: ProviderConfig[]
  onClose: () => void
  onSave: (config: KnowledgeRagConfig) => void
}) {
  const [config, setConfig] = useState(base.config)
  const embeddingProviders = filterKnowledgeModelProviders(providers, 'embedding')
  const rerankProviders = filterKnowledgeModelProviders(providers, 'rerank')
  return (
    <DialogShell title="知识库设置" onClose={onClose}>
      <label>嵌入模型</label>
      <select
        value={config.embeddingProviderId ?? ''}
        onChange={(event) => {
          const provider = providers.find((item) => item.id === event.target.value)
          setConfig((current) => ({
            ...current,
            embeddingProviderId: provider?.id,
            embeddingModel: provider?.model,
          }))
        }}
      >
        <option value="">选择嵌入模型</option>
        {embeddingProviders.map((provider) => (
          <option key={provider.id} value={provider.id}>{provider.name}</option>
        ))}
      </select>
      {!embeddingProviders.length && (
        <small className="knowledge-dialog-hint">
          先到模型服务里给嵌入模型打上“嵌入”标签
        </small>
      )}
      <label>重排模型</label>
      <select
        value={config.rerankProviderId ?? ''}
        onChange={(event) => {
          const provider = providers.find((item) => item.id === event.target.value)
          setConfig((current) => ({
            ...current,
            rerankProviderId: provider?.id,
            rerankModel: provider?.model,
          }))
        }}
      >
        <option value="">不使用重排</option>
        {rerankProviders.map((provider) => (
          <option key={provider.id} value={provider.id}>{provider.name}</option>
        ))}
      </select>
      {!rerankProviders.length && (
        <small className="knowledge-dialog-hint">
          先到模型服务里给重排模型打上“重排”标签
        </small>
      )}
      <NumberInput label="分块大小" value={config.chunkSize} onChange={(value) => setConfig((current) => ({ ...current, chunkSize: value }))} />
      <NumberInput label="重叠长度" value={config.chunkOverlap} onChange={(value) => setConfig((current) => ({ ...current, chunkOverlap: value }))} />
      <NumberInput label="召回数量" value={config.topK} onChange={(value) => setConfig((current) => ({ ...current, topK: value }))} />
      <NumberInput label="相似度阈值" step={0.01} value={config.threshold} onChange={(value) => setConfig((current) => ({ ...current, threshold: value }))} />
      <label className="knowledge-checkbox">
        <input
          type="checkbox"
          checked={config.rerankEnabled}
          onChange={(event) => setConfig((current) => ({ ...current, rerankEnabled: event.target.checked }))}
        />
        启用重排
      </label>
      <div className="knowledge-dialog-actions">
        <button type="button" onClick={onClose}>取消</button>
        <button type="button" onClick={() => onSave(config)}>保存</button>
      </div>
    </DialogShell>
  )
}

export function RecallTestDialog({
  base,
  onClose,
  service,
}: {
  base: KnowledgeBase
  onClose: () => void
  service: ReturnType<typeof createKnowledgeService>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KnowledgeSearchResult[]>([])
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      setResults(await service.search({ baseIds: [base.id], query }))
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogShell title="召回测试" onClose={onClose} wide>
      <div className="knowledge-recall-search">
        <input value={query} placeholder="输入测试问题" onChange={(event) => setQuery(event.target.value)} />
        <button type="button" onClick={() => void run()}>{busy ? '检索中' : '测试'}</button>
      </div>
      <div className="knowledge-recall-results">
        {results.map((result) => (
          <article key={result.chunkId}>
            <strong>{result.itemTitle} #{result.chunkIndex + 1}</strong>
            <span>分数 {(result.rerankScore ?? result.score).toFixed(4)}</span>
            <p>{result.content}</p>
          </article>
        ))}
      </div>
    </DialogShell>
  )
}

function NumberInput({
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

function DialogShell({
  children,
  onClose,
  title,
  wide = false,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
  wide?: boolean
}) {
  return (
    <div className="knowledge-dialog-backdrop" role="presentation">
      <section className={`knowledge-dialog ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true">
        <header>
          <h2>{title}</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </header>
        <div className="knowledge-dialog-body">{children}</div>
      </section>
    </div>
  )
}
