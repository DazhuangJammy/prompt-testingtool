import { Check, Eye, EyeOff, Shield } from 'lucide-react'
import type {
  WebSearchProviderConfig,
  WebSearchProviderId,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import {
  isWebSearchProviderSupported,
  providerRequiresApiKey,
} from '../model/webSearchProviders'
import type { WebSearchSettingsCheckState } from './webSearchSettingsPanelTypes'

interface WebSearchProviderSettingsProps {
  checkState: WebSearchSettingsCheckState
  defaultProviderId?: WebSearchProviderId
  keyVisible: boolean
  provider: WebSearchProviderConfig
  onCheck: () => void
  onSave: () => void
  onSetDefault: () => void
  onToggleKeyVisible: () => void
  onUpdateProvider: (updates: Partial<WebSearchProviderConfig>) => void
}

export function WebSearchProviderSettings({
  checkState,
  defaultProviderId,
  keyVisible,
  provider,
  onCheck,
  onSave,
  onSetDefault,
  onToggleKeyVisible,
  onUpdateProvider,
}: WebSearchProviderSettingsProps) {
  return (
    <div className="web-search-provider-card">
      <div className="settings-panel-head">
        <div>
          <h3>服务商配置</h3>
          <span>{getProviderCapabilityText(provider.id)}</span>
        </div>
        {defaultProviderId === provider.id && (
          <span className="settings-status is-ok">默认</span>
        )}
      </div>

      <div className="settings-field-grid">
        <label className="settings-field">
          <span>API 地址</span>
          <input
            value={provider.apiHost}
            disabled={!isWebSearchProviderSupported(provider.id)}
            onChange={(event) => onUpdateProvider({ apiHost: event.target.value })}
          />
        </label>
        {providerRequiresApiKey(provider.id) && (
          <label className="settings-field">
            <span>API 密钥</span>
            <div className="settings-input-action">
              <input
                value={provider.apiKeys.join(',')}
                type={keyVisible ? 'text' : 'password'}
                placeholder="多个密钥用逗号分隔"
                onChange={(event) =>
                  onUpdateProvider({ apiKeys: event.target.value.split(',') })
                }
              />
              <IconButton
                className="settings-key-toggle"
                icon={keyVisible ? <EyeOff /> : <Eye />}
                label={keyVisible ? '隐藏密钥' : '显示密钥'}
                onClick={onToggleKeyVisible}
              />
            </div>
          </label>
        )}
        {provider.id === 'searxng' && (
          <>
            <label className="settings-field">
              <span>搜索引擎</span>
              <input
                value={(provider.engines ?? []).join(',')}
                placeholder="google,bing"
                onChange={(event) =>
                  onUpdateProvider({ engines: event.target.value.split(',') })
                }
              />
            </label>
            <label className="settings-field">
              <span>Basic Auth 用户名</span>
              <input
                value={provider.basicAuthUsername ?? ''}
                onChange={(event) =>
                  onUpdateProvider({ basicAuthUsername: event.target.value })
                }
              />
            </label>
            <label className="settings-field">
              <span>Basic Auth 密码</span>
              <input
                value={provider.basicAuthPassword ?? ''}
                type="password"
                onChange={(event) =>
                  onUpdateProvider({ basicAuthPassword: event.target.value })
                }
              />
            </label>
          </>
        )}
      </div>

      <div className="settings-status-row">
        {checkState.status !== 'idle' && (
          <span className={`settings-status is-${checkState.status}`}>
            {checkState.message}
          </span>
        )}
      </div>

      <div className="provider-detail-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={!isWebSearchProviderSupported(provider.id)}
          onClick={onCheck}
        >
          <Shield size={16} />
          检测
        </button>
        <button type="button" className="secondary-button" onClick={onSetDefault}>
          <Check size={16} />
          设为默认
        </button>
        <button type="button" className="primary-button" onClick={onSave}>
          保存配置
        </button>
      </div>
    </div>
  )
}

function getProviderCapabilityText(providerId: WebSearchProviderId) {
  if (providerId === 'exa-mcp') {
    return 'Cherry 通过 MCP 运行；当前项目没有 MCP 搜索运行时，所以暂不启用'
  }
  if (providerId === 'google' || providerId === 'bing' || providerId === 'baidu') {
    return '免费搜索入口依赖搜索页面结构，可能因网络或反爬不可用'
  }
  return '按 Cherry Studio 的搜索 API 协议接入'
}
