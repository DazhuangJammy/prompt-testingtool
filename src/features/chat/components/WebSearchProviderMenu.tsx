import type {
  WebSearchProviderConfig,
  WebSearchProviderId,
} from '@/shared/types'
import { providerRequiresApiKey } from '@/features/web-search/model/webSearchProviders'
import { isRunnableProvider } from '@/features/web-search/model/webSearchSettings'

interface WebSearchProviderMenuProps {
  activeProviderId?: WebSearchProviderId
  enabled: boolean
  providers: WebSearchProviderConfig[]
  onDisable: () => void
  onSelect: (providerId: WebSearchProviderId) => void
}

export function WebSearchProviderMenu({
  activeProviderId,
  enabled,
  providers,
  onDisable,
  onSelect,
}: WebSearchProviderMenuProps) {
  const visibleProviders = providers.filter(
    (provider) => provider.id !== 'searxng' && provider.id !== 'exa',
  )

  return (
    <div className="composer-menu web-search-provider-menu">
      {visibleProviders.map((provider) => {
        const runnable = isRunnableProvider(provider)
        return (
          <button
            type="button"
            className={
              enabled && provider.id === activeProviderId ? 'is-active' : ''
            }
            disabled={!runnable}
            key={provider.id}
            onClick={() => onSelect(provider.id)}
          >
            <span className="web-search-provider-menu-main">
              <ProviderGlyph providerId={provider.id} />
              <span>{provider.name}</span>
            </span>
            <small>{getWebSearchProviderBadge(provider, runnable)}</small>
          </button>
        )
      })}
      <div className="web-search-provider-menu-footer">
        <span>网络搜索</span>
        <small>ESC 关闭</small>
      </div>
      {enabled && (
        <button
          type="button"
          className="web-search-provider-menu-disable"
          onClick={onDisable}
        >
          <span>关闭网络搜索</span>
          <small>本次聊天不检索网页</small>
        </button>
      )}
    </div>
  )
}

function ProviderGlyph({ providerId }: { providerId: WebSearchProviderId }) {
  const label =
    providerId === 'google'
      ? 'G'
      : providerId === 'bing'
        ? 'b'
        : providerId === 'baidu'
          ? 'du'
          : providerId === 'zhipu'
            ? 'Z'
            : providerId === 'bocha'
              ? 'B'
              : providerId === 'exa-mcp'
                ? '◎'
                : 'S'
  return <span className="web-search-provider-glyph">{label}</span>
}

function getWebSearchProviderBadge(
  provider: WebSearchProviderConfig,
  runnable: boolean,
) {
  if (!runnable) return '未配置'
  if (providerRequiresApiKey(provider.id)) return 'API 密钥'
  return '免费'
}
