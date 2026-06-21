import { Plus, X, PanelRightClose, PanelRightOpen } from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'
import type {
  ChatAttachment,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { ChatComposer } from './components/ChatComposer'
import { MessageList } from './components/MessageList'
import { PanelMeta } from './components/PanelMeta'
import { getComparePanelWidth, type ComparePaneState } from './model/comparePanes'
import { type ComparePaneView, useChatPanelState } from './useChatPanelState'

interface ChatPanelProps {
  card?: PromptCard
  provider?: ProviderConfig
  promptCards: PromptCard[]
  providers: ProviderConfig[]
  compareOpen: boolean
  comparePaneCardIds: string[]
  comparePanes: ComparePaneState[]
  collapsed: boolean
  onResizeStart: (event: PointerEvent) => void
  activeSessionId?: string
  onToggle: () => void
  onSelectProvider: (id: string) => void
  onActiveSessionChange: (id?: string) => void
  onActiveCardChange?: (id: string) => void
  onCompareOpenChange: (open: boolean) => void
  onComparePaneCardIdsChange: (cardIds: string[]) => void
  onComparePanesChange: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void
  onEnsureWidth: (width: number) => void
  width: number
}

export function ChatPanel({
  card,
  provider,
  promptCards,
  providers,
  compareOpen,
  comparePaneCardIds,
  comparePanes,
  collapsed,
  onResizeStart,
  activeSessionId,
  onToggle,
  onSelectProvider,
  onActiveSessionChange,
  onActiveCardChange,
  onCompareOpenChange,
  onComparePaneCardIdsChange,
  onComparePanesChange,
  onEnsureWidth,
  width,
}: ChatPanelProps) {
  const state = useChatPanelState(
    card,
    provider,
    promptCards,
    providers,
    compareOpen,
    comparePaneCardIds,
    comparePanes,
    activeSessionId,
    onActiveSessionChange,
    onCompareOpenChange,
    onComparePaneCardIdsChange,
    onComparePanesChange,
    onActiveCardChange,
  )
  const disabled = !provider || !card
  const compareDisabled = promptCards.length < 2
  const openCompare = () => {
    const nextOpen = !compareOpen
    if (nextOpen) {
      onEnsureWidth(getComparePanelWidth(state.comparePanes.length))
      onComparePanesChange(state.comparePanes)
    }
    onCompareOpenChange(nextOpen)
  }
  const addComparePane = () => {
    onEnsureWidth(getComparePanelWidth(state.comparePanes.length + 1))
    state.addComparePane()
  }

  return (
    <aside
      className={`chat-panel ${collapsed ? 'is-collapsed' : ''} ${
        compareOpen ? 'is-compare' : ''
      }`}
      style={{ '--panel-width': `${width}px` } as CSSProperties}
    >
      {!collapsed && (
        <button
          type="button"
          className="panel-resizer is-left"
          aria-label="调整宽度"
          onPointerDown={onResizeStart}
        />
      )}
      <div className="panel-head">
        {!collapsed && <span>{compareOpen ? '对比模式' : (card?.title ?? '测试')}</span>}
        <div className="panel-head-actions">
          {!collapsed && compareOpen && (
            <IconButton
              icon={<Plus />}
              label="新增"
              disabled={!state.canAddComparePane}
              onClick={addComparePane}
            />
          )}
          <IconButton
            icon={collapsed ? <PanelRightOpen /> : <PanelRightClose />}
            label={collapsed ? '展开' : '收起'}
            onClick={onToggle}
          />
        </div>
      </div>

      {!collapsed &&
        (compareOpen ? (
          <div className="split-chat">
            {state.comparePanes.map((pane, index) => (
              <SplitPane
                key={pane.id}
                pane={pane}
                cards={promptCards}
                canRemove={state.canRemoveComparePane}
                disabled={!pane.provider || !pane.card}
                generating={state.isRequestActive(pane.id)}
                index={index}
                providers={providers}
                onCardChange={(id) => state.setComparePaneCard(pane.id, id)}
                onClear={() => void state.clearCompareMessages(pane.id)}
                onEdit={state.editMessage}
                onRemove={() => state.removeComparePane(pane.id)}
                onPromptInjectionModeChange={(mode) =>
                  state.setComparePanePromptInjectionMode(pane.id, mode)
                }
                onProviderChange={(id) => state.setComparePaneProvider(pane.id, id)}
                onResend={(message, content) =>
                  state.resendCompareMessage(pane.id, message, content)
                }
                onSend={() => void state.sendCompareMessage(pane.id)}
                onStop={() => state.stopGeneration(pane.id)}
                onAttachmentsChange={(value) =>
                  state.setComparePaneAttachments(pane.id, value)
                }
                onTextChange={(value) => state.setComparePaneInput(pane.id, value)}
                onThinkingModeChange={(mode) =>
                  state.setComparePaneThinkingMode(pane.id, mode)
                }
              />
            ))}
          </div>
        ) : (
          <>
            <PanelMeta
              activeProviderId={provider?.id}
              compareDisabled={compareDisabled}
              compareOpen={compareOpen}
              providers={providers}
              onToggleCompare={openCompare}
              onSelectProvider={onSelectProvider}
            />
            <MessageList
              messages={state.mainMessages}
              onEdit={state.editMessage}
              onResend={state.resendMainMessage}
            />
            {state.error && <div className="error-line">{state.error}</div>}
            <ChatComposer
              attachmentCapability={state.attachmentCapability}
              attachments={state.attachments}
              busy={state.busy}
              canClearMessages={state.mainMessages.length > 0}
              disabled={disabled}
              generating={state.activeRequest === 'main'}
              input={state.input}
              promptInjectionMode={state.promptInjectionMode}
              supportsDeepThinking={state.supportsDeepThinking}
              supportsThinking={state.supportsThinking}
              thinkingMode={state.thinkingMode}
              onAttachmentsChange={state.setAttachments}
              onChange={state.setInput}
              onClearMessages={state.clearMainMessages}
              onPromptInjectionModeChange={state.setPromptInjectionMode}
              onSend={state.sendMainMessage}
              onStop={state.stopGeneration}
              onThinkingModeChange={(mode) =>
                state.setThinkingModeForProvider(provider, mode)
              }
            />
          </>
        ))}
    </aside>
  )
}

interface SplitPaneProps {
  pane: ComparePaneView
  cards: PromptCard[]
  canRemove: boolean
  disabled: boolean
  generating: boolean
  index: number
  providers: ProviderConfig[]
  onCardChange: (id: string) => void
  onClear: () => void
  onEdit: ReturnType<typeof useChatPanelState>['editMessage']
  onRemove: () => void
  onPromptInjectionModeChange: (mode: PromptInjectionMode) => void
  onProviderChange: (id: string) => void
  onResend: ReturnType<typeof useChatPanelState>['resendMainMessage']
  onSend: () => void
  onStop: () => void
  onTextChange: (value: string) => void
  onAttachmentsChange: (value: ChatAttachment[]) => void
  onThinkingModeChange: (mode: ThinkingMode) => void
}

function SplitPane({
  pane,
  cards,
  canRemove,
  disabled,
  generating,
  index,
  providers,
  onCardChange,
  onClear,
  onEdit,
  onRemove,
  onPromptInjectionModeChange,
  onProviderChange,
  onResend,
  onSend,
  onStop,
  onAttachmentsChange,
  onTextChange,
  onThinkingModeChange,
}: SplitPaneProps) {
  return (
    <section className="split-pane">
      <PanelMeta
        activeProviderId={pane.provider?.id}
        providers={providers}
        onSelectProvider={onProviderChange}
      />
      <MessageList messages={pane.messages} onEdit={onEdit} onResend={onResend} />
      <div className="pane-card-select">
        <select
          aria-label="提示词卡片"
          value={pane.card?.id ?? ''}
          onChange={(event) => onCardChange(event.target.value)}
        >
          {cards.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <span>{index + 1}</span>
        <IconButton
          icon={<X />}
          label="删除"
          disabled={!canRemove}
          onClick={onRemove}
        />
      </div>
      <ChatComposer
        attachmentCapability={pane.attachmentCapability}
        attachments={pane.attachments}
        busy={generating}
        canClearMessages={pane.messages.length > 0}
        disabled={disabled}
        generating={generating}
        input={pane.input}
        promptInjectionMode={pane.promptInjectionMode}
        supportsDeepThinking={pane.thinkingCapability.supportsDeepMode}
        supportsThinking={pane.thinkingCapability.supportsThinking}
        thinkingMode={pane.thinkingMode}
        onAttachmentsChange={onAttachmentsChange}
        onChange={onTextChange}
        onClearMessages={onClear}
        onPromptInjectionModeChange={onPromptInjectionModeChange}
        onSend={onSend}
        onStop={onStop}
        onThinkingModeChange={onThinkingModeChange}
      />
    </section>
  )
}
