import { RotateCcw } from 'lucide-react'
import type { WebSearchProviderId, WebSearchSettings } from '@/shared/types'
import {
  DEFAULT_WEB_SEARCH_CUTOFF_LIMIT,
  DEFAULT_WEB_SEARCH_MAX_RESULTS,
} from '../model/webSearchSettings'

interface WebSearchGeneralSettingsProps {
  draft: WebSearchSettings
  onSave: (settings: WebSearchSettings) => void
  onUpdate: (updates: Partial<WebSearchSettings>) => void
}

export function WebSearchGeneralSettings({
  draft,
  onSave,
  onUpdate,
}: WebSearchGeneralSettingsProps) {
  return (
    <div className="web-search-general-card">
      <div className="settings-panel-head">
        <div>
          <h3>基础设置</h3>
          <span>发送消息前检索网页，并把来源交给模型引用</span>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            onSave({
              ...draft,
              maxResults: DEFAULT_WEB_SEARCH_MAX_RESULTS,
              excludeDomains: [],
              compression: {
                method: 'none',
                cutoffLimit: DEFAULT_WEB_SEARCH_CUTOFF_LIMIT,
              },
            })
          }
        >
          <RotateCcw size={16} />
          恢复默认
        </button>
      </div>

      <div className="settings-field-grid">
        <label className="settings-field">
          <span>默认搜索</span>
          <select
            value={draft.defaultProviderId ?? ''}
            onChange={(event) =>
              onUpdate({
                defaultProviderId: event.target.value as WebSearchProviderId,
              })
            }
          >
            {draft.providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-field">
          <span>搜索结果数量</span>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.maxResults}
            onChange={(event) => onUpdate({ maxResults: Number(event.target.value) })}
          />
        </label>
        <label className="settings-inline-toggle">
          <input
            type="checkbox"
            checked={draft.searchWithTime}
            onChange={(event) => onUpdate({ searchWithTime: event.target.checked })}
          />
          <span>搜索时加入当天日期</span>
        </label>
        <label className="settings-field">
          <span>排除域名</span>
          <textarea
            value={draft.excludeDomains.join('\n')}
            placeholder="example.com"
            onChange={(event) =>
              onUpdate({
                excludeDomains: event.target.value.split('\n'),
              })
            }
          />
          <small>每行一个域名；搜索结果会过滤这些来源</small>
        </label>
        <label className="settings-field">
          <span>结果压缩</span>
          <select
            value={draft.compression.method}
            onChange={(event) =>
              onUpdate({
                compression: {
                  ...draft.compression,
                  method: event.target.value === 'cutoff' ? 'cutoff' : 'none',
                },
              })
            }
          >
            <option value="none">不压缩</option>
            <option value="cutoff">按字符截断</option>
          </select>
        </label>
        {draft.compression.method === 'cutoff' && (
          <label className="settings-field">
            <span>截断字符数</span>
            <input
              type="number"
              min={200}
              max={12000}
              value={draft.compression.cutoffLimit}
              onChange={(event) =>
                onUpdate({
                  compression: {
                    ...draft.compression,
                    cutoffLimit: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        )}
      </div>
    </div>
  )
}
