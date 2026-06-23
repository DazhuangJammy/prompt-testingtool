import {
  BookOpen,
  FileText,
  Folder,
  Globe,
  Link,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
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
  KnowledgeSettingsDialog,
  RecallTestDialog,
  TextSourceDialog,
} from './KnowledgeDialogs'
import { KnowledgeItemList, SourceActions } from './KnowledgeSourcePanel'

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

  const createBase = async (name: string) => {
    const base = await knowledge.runBusy(() =>
      knowledge.service.createBase({
        name,
        config: inferDefaultModelConfig(providerConfigs),
      }),
    )
    knowledge.setActiveBaseId(base.id)
    setDialog(undefined)
  }

  const addFiles = async (files: File[]) => {
    if (!knowledge.activeBaseId || !files.length) return
    const supported = files.filter((file) => isSupportedKnowledgeFile(file.name))
    await knowledge.runBusy(() =>
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
    await knowledge.runBusy(() =>
      knowledge.service.addItems(knowledge.activeBaseId!, [
        { sourceType, ...input },
      ]),
    )
    setDialog(undefined)
  }

  const deleteItem = async (item: KnowledgeItem) => {
    if (!confirm(`删除资料「${item.title}」？`)) return
    await knowledge.runBusy(() => knowledge.service.deleteItems(item.baseId, [item.id]))
  }

  const deleteBase = async (base: KnowledgeBase) => {
    if (!confirm(`删除知识库「${base.name}」？`)) return
    await knowledge.runBusy(() => knowledge.service.deleteBase(base.id))
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
              onClick={() => knowledge.setActiveBaseId(base.id)}
            >
              <BookOpen />
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
                  {knowledge.items.length} 个资料 · 分块 {knowledge.activeBase.config.chunkSize} · 召回{' '}
                  {knowledge.activeBase.config.topK}
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
                <IconButton icon={<Settings2 />} label="设置" onClick={() => setDialog('settings')} />
                <IconButton icon={<MoreHorizontal />} label="召回测试" onClick={() => setDialog('recall')} />
                <IconButton icon={<Trash2 />} label="删除知识库" onClick={() => deleteBase(knowledge.activeBase!)} />
              </div>
            </header>

            <div className="knowledge-tabs">
              {SOURCE_TABS.map((tab) => {
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
              />
              <KnowledgeItemList
                items={visibleItems}
                busy={knowledge.busy}
                onDelete={deleteItem}
                onReindex={(item) =>
                  knowledge.runBusy(() => knowledge.service.reindexItems(item.baseId, [item.id]))
                }
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

      {dialog === 'base' && <CreateBaseDialog onClose={() => setDialog(undefined)} onCreate={createBase} />}
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
        <KnowledgeSettingsDialog
          base={knowledge.activeBase}
          providers={providerConfigs}
          onClose={() => setDialog(undefined)}
          onSave={(config) =>
            knowledge
              .runBusy(() => knowledge.service.updateBase(knowledge.activeBase!.id, { config }))
              .then(() => setDialog(undefined))
          }
        />
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
