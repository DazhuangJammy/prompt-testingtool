import {
  AlertCircle,
  BookOpen,
  Cloud,
  FileText,
  Folder,
  Globe,
  Link,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type {
  KnowledgeBase,
  KnowledgeItem,
  KnowledgeSourceType,
  ProviderConfig,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import {
  KNOWLEDGE_SOURCE_LABELS,
  filterKnowledgeModelProviders,
  isSupportedKnowledgeFile,
} from '../model/knowledge'
import { useKnowledgeData } from '../hooks/useKnowledgeData'
import {
  CreateBaseDialog,
  type CreateBaseDialogInput,
  KnowledgeSettingsDialog,
  RecallTestDialog,
  TextSourceDialog,
} from './KnowledgeDialogs'
import { KnowledgeItemList, SourceActions } from './KnowledgeSourcePanel'
import {
  BailianKnowledgeSettingsDialog,
  type BailianSettingsInput,
} from './BailianKnowledgeSettingsDialog'

const SOURCE_TABS: Array<{ type: KnowledgeSourceType; icon: typeof FileText }> = [
  { type: 'file', icon: FileText },
  { type: 'note', icon: BookOpen },
  { type: 'directory', icon: Folder },
  { type: 'url', icon: Link },
  { type: 'website', icon: Globe },
]

interface KnowledgeWorkspaceProps {
  providerConfigs: ProviderConfig[]
}

export function KnowledgeWorkspace({ providerConfigs }: KnowledgeWorkspaceProps) {
  const knowledge = useKnowledgeData(providerConfigs)
  const [activeSource, setActiveSource] = useState<KnowledgeSourceType>('file')
  const [searchQuery, setSearchQuery] = useState('')
  const [baseSearchQuery, setBaseSearchQuery] = useState('')
  const [dialog, setDialog] = useState<'base' | 'note' | 'url' | 'website' | 'settings' | 'recall'>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseCounts = useMemo(
    () =>
      knowledge.allItems.reduce<Record<string, number>>((counts, item) => {
        counts[item.baseId] = (counts[item.baseId] ?? 0) + 1
        return counts
      }, {}),
    [knowledge.allItems],
  )
  const visibleBases = useMemo(() => {
    const keyword = baseSearchQuery.trim().toLowerCase()
    if (!keyword) return knowledge.bases
    return knowledge.bases.filter((base) => base.name.toLowerCase().includes(keyword))
  }, [baseSearchQuery, knowledge.bases])
  const visibleItems = useMemo(
    () =>
      knowledge.items.filter(
        (item) =>
          item.sourceType === activeSource &&
          item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [activeSource, knowledge.items, searchQuery],
  )

  const runAction = async <T,>(task: () => Promise<T>) => {
    try {
      return await knowledge.runBusy(task)
    } catch {
      return undefined
    }
  }

  const createBase = async (input: CreateBaseDialogInput) => {
    const base = await runAction(() =>
      knowledge.service.createBase({
        ...input,
        config: input.providerType === 'local'
          ? inferDefaultModelConfig(providerConfigs)
          : undefined,
      }),
    )
    if (!base) return
    knowledge.setActiveBaseId(base.id)
    setActiveSource('file')
    setDialog(undefined)
  }

  const addFiles = async (files: File[]) => {
    if (!knowledge.activeBaseId || !files.length) return
    const supported = knowledge.activeBase?.providerType === 'bailian'
      ? files
      : files.filter((file) => isSupportedKnowledgeFile(file.name))
    await runAction(() =>
      knowledge.service.addItems(knowledge.activeBaseId!, [
        { sourceType: 'file', title: '文件', files: supported },
      ]),
    )
  }

  const addTextSource = async (
    sourceType: 'note' | 'url' | 'website',
    input: { title: string; text?: string; sourceUri?: string },
  ) => {
    if (!knowledge.activeBaseId) return
    await runAction(() =>
      knowledge.service.addItems(knowledge.activeBaseId!, [
        { sourceType, ...input },
      ]),
    )
    setDialog(undefined)
  }

  const deleteItem = async (item: KnowledgeItem) => {
    const remote = knowledge.activeBase?.providerType === 'bailian'
      ? '这会同时从阿里百炼知识库中删除该文件。'
      : ''
    if (!confirm(`删除资料「${item.title}」？${remote}`)) return
    await runAction(() => knowledge.service.deleteItems(item.baseId, [item.id]))
  }

  const deleteBase = async (base: KnowledgeBase) => {
    const message = base.providerType === 'bailian'
      ? `从本项目移除知识库「${base.name}」？阿里百炼中的线上知识库和文件不会被删除。`
      : `删除知识库「${base.name}」？`
    if (!confirm(message)) return
    await runAction(() => knowledge.service.deleteBase(base.id))
  }

  const saveBailianSettings = async (input: BailianSettingsInput) => {
    if (!knowledge.activeBase) return
    const saved = await runAction(() => knowledge.service.updateBase(
      knowledge.activeBase!.id,
      input,
    ))
    if (saved) setDialog(undefined)
  }

  return (
    <section className="knowledge-workspace">
      <aside className="knowledge-nav">
        <div className="knowledge-nav-head">
          <div className="knowledge-nav-search">
            <Search />
            <input
              value={baseSearchQuery}
              placeholder="搜索知识库"
              onChange={(event) => setBaseSearchQuery(event.target.value)}
            />
          </div>
          <IconButton icon={<Plus />} label="新建知识库" onClick={() => setDialog('base')} />
        </div>
        <div className="knowledge-base-list">
          {visibleBases.map((base) => (
            <button
              type="button"
              className={`knowledge-base-row ${base.id === knowledge.activeBaseId ? 'is-active' : ''}`}
              key={base.id}
              onClick={() => {
                knowledge.setActiveBaseId(base.id)
                if (base.providerType === 'bailian') setActiveSource('file')
              }}
            >
              {base.providerType === 'bailian' ? <Cloud /> : <BookOpen />}
              <span>{base.name}</span>
              <small>{baseCounts[base.id] ?? 0}</small>
            </button>
          ))}
          {!knowledge.bases.length && (
            <button type="button" className="knowledge-empty-create" onClick={() => setDialog('base')}>
              <Plus />
              <span>添加知识库</span>
            </button>
          )}
        </div>
      </aside>

      <main className="knowledge-main">
        {knowledge.activeBase ? (
          <>
            <header className="knowledge-detail-head">
              <div>
                <h1>{knowledge.activeBase.name}</h1>
                <p>
                  {knowledge.activeBase.providerType === 'bailian' ? '阿里百炼' : '本地'} ·{' '}
                  {knowledge.items.length} 个资料 · 召回 {knowledge.activeBase.config.topK}
                </p>
              </div>
              <div className="knowledge-head-actions">
                <label className="knowledge-inline-search">
                  <Search />
                  <input
                    value={searchQuery}
                    placeholder="搜索资料"
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
                <IconButton disabled={knowledge.busy} icon={<Settings2 />} label="设置" onClick={() => setDialog('settings')} />
                {knowledge.activeBase.providerType === 'bailian' && (
                  <IconButton
                    icon={<RefreshCw />}
                    disabled={knowledge.busy}
                    label="同步百炼资料"
                    onClick={() => void runAction(() => knowledge.service.refreshBase(knowledge.activeBase!.id))}
                  />
                )}
                <IconButton disabled={knowledge.busy} icon={<MoreHorizontal />} label="召回测试" onClick={() => setDialog('recall')} />
                <IconButton disabled={knowledge.busy} icon={<Trash2 />} label="删除知识库" onClick={() => deleteBase(knowledge.activeBase!)} />
              </div>
            </header>

            {knowledge.error && (
              <div className="knowledge-error-banner" role="alert">
                <AlertCircle />
                <span>{knowledge.error}</span>
                <button type="button" aria-label="关闭错误提示" onClick={knowledge.clearError}>
                  <X />
                </button>
              </div>
            )}

            <div className="knowledge-tabs">
              {SOURCE_TABS
                .filter((tab) => knowledge.activeBase?.providerType === 'local' || tab.type === 'file')
                .map((tab) => {
                const Icon = tab.icon
                const count = knowledge.items.filter((item) => item.sourceType === tab.type).length
                return (
                  <button
                    type="button"
                    className={tab.type === activeSource ? 'is-active' : ''}
                    key={tab.type}
                    onClick={() => setActiveSource(tab.type)}
                  >
                    <Icon />
                    <span>{KNOWLEDGE_SOURCE_LABELS[tab.type]}</span>
                    <small>{count}</small>
                  </button>
                )
                })}
            </div>

            <section className="knowledge-source-panel">
              <SourceActions
                activeSource={activeSource}
                busy={knowledge.busy}
                fileInputRef={fileInputRef}
                onAddDialog={setDialog}
                onFiles={addFiles}
                providerType={knowledge.activeBase.providerType}
              />
              <KnowledgeItemList
                items={visibleItems}
                busy={knowledge.busy}
                onDelete={deleteItem}
                onReindex={knowledge.activeBase.providerType === 'local'
                  ? (item) => void runAction(() => knowledge.service.reindexItems(item.baseId, [item.id]))
                  : undefined}
              />
            </section>
          </>
        ) : (
          <div className="knowledge-empty-state">
            <BookOpen />
            <h2>创建第一个知识库</h2>
            <p>导入资料、生成索引，然后在聊天里加载它做商业测试。</p>
            <button type="button" onClick={() => setDialog('base')}>
              新建知识库
            </button>
          </div>
        )}
      </main>

      {dialog === 'base' && (
        <CreateBaseDialog
          busy={knowledge.busy}
          onClose={() => setDialog(undefined)}
          onCreate={createBase}
        />
      )}
      {dialog === 'note' && (
        <TextSourceDialog
          kind="note"
          title="添加笔记"
          onClose={() => setDialog(undefined)}
          onSubmit={(input) => addTextSource('note', input)}
        />
      )}
      {dialog === 'url' && (
        <TextSourceDialog
          kind="url"
          title="添加网址"
          onClose={() => setDialog(undefined)}
          onSubmit={(input) => addTextSource('url', input)}
        />
      )}
      {dialog === 'website' && (
        <TextSourceDialog
          kind="website"
          title="添加网站 sitemap"
          onClose={() => setDialog(undefined)}
          onSubmit={(input) => addTextSource('website', input)}
        />
      )}
      {dialog === 'settings' && knowledge.activeBase && (
        knowledge.activeBase.providerType === 'bailian' ? (
          <BailianKnowledgeSettingsDialog
            base={knowledge.activeBase}
            busy={knowledge.busy}
            onClose={() => setDialog(undefined)}
            onSave={(input) => void saveBailianSettings(input)}
          />
        ) : (
          <KnowledgeSettingsDialog
            base={knowledge.activeBase}
            providers={providerConfigs}
            onClose={() => setDialog(undefined)}
            onSave={(config) => {
              void runAction(() => knowledge.service.updateBase(knowledge.activeBase!.id, { config }))
                .then((saved) => {
                  if (saved) setDialog(undefined)
                })
            }}
          />
        )
      )}
      {dialog === 'recall' && knowledge.activeBase && (
        <RecallTestDialog
          base={knowledge.activeBase}
          service={knowledge.service}
          onClose={() => setDialog(undefined)}
        />
      )}
    </section>
  )
}

function inferDefaultModelConfig(providers: ProviderConfig[]) {
  const embedding =
    filterKnowledgeModelProviders(providers, 'embedding')[0] ??
    providers.find((provider) => /embed|embedding|text-embedding/i.test(provider.model)) ??
    providers.find((provider) => provider.type === 'dashscope')
  const rerank =
    filterKnowledgeModelProviders(providers, 'rerank')[0] ??
    providers.find((provider) => /rerank/i.test(provider.model))
  return {
    embeddingProviderId: embedding?.id,
    embeddingModel: embedding?.model,
    rerankProviderId: rerank?.id,
    rerankModel: rerank?.model,
    rerankEnabled: Boolean(rerank),
  }
}
