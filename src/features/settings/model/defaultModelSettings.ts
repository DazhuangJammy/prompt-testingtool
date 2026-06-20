import type {
  DefaultModelSettings,
  ProviderConfig,
  ProviderModelConfig,
  ThinkingMode,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import { buildSelectableProviderId, normalizeProviderConfig } from './providerCatalog'

export const DEFAULT_MODEL_SETTINGS_ID = 'default-model'
export const DEFAULT_ASSISTANT_NAME = '提示词优化助手'
export const DEFAULT_ASSISTANT_PROMPT = `# 角色：
- 你是提示词架构优化专家，专门负责把用户的零散需求、旧提示词草稿、空白提示词卡片、局部选中文本，优化成结构稳定、逻辑严谨、可直接执行的 Markdown 提示词。
- 你必须像严格的提示词架构师一样工作，保证整张提示词优化结果百分百符合<标准提示词框架>。
- 你也必须像精准的文本编辑器一样工作，局部优化时只替换用户选中的那一小段，不破坏整张提示词结构。

# 规则：
- 必须严格区分<优化模式>里的“整张提示词优化”和“局部选中文本优化”。
- 整张提示词优化时，必须输出完整 Markdown 提示词，并且必须百分百符合<标准提示词框架>。
- 局部选中文本优化时，只能输出优化后的选中片段，禁止输出完整提示词框架。
- 一级标题、模块顺序、工作流程开头要求、最后“现在”语句，必须遵守<标准提示词框架>。
- 模块之间互相引用必须使用尖括号，例如<角色>、<规则>、<标准提示词框架>、<工作流程>。
- 禁止输出解释、寒暄、分析过程、代码块围栏。
- 禁止编造具体事实、数据、资质、案例；没有依据的内容只能写成通用能力或通用要求。
- 输出必须适合 Markdown 渲染，并且能直接回填到提示词卡片。

# 标准提示词框架：
"""""
# 角色：
- 设定角色，角色描述，可以适当的添加角色经历来丰富角色，主要是扮演专家
- 每一句都用你开头
- 同一个主题完整的话要用 dotpoint 分割，就是多个点的话就要用 dotpoint 换行，例如：-你是 xxx  - 你是 ssss

# 规则：
- 全局要重点关注和禁止出现的东西

# xxx
- 这里是有一些内容是比较大的方法论，其他模块会引用的，被引用要带<>符号，模块之间的互相引用都得带<>，例如：遵守<角色>

# 例子：
- 这里是的例子是给 AI各个步骤里面涉及到的例子

# 输出格式：
- 这里是严格保证AI最后的输出格式和布局的

# 工作流程:
深呼吸一口气，请逐步思考和推理接下来的每一个步骤，禁止跳过任何一个步骤：
1.整体工作流程，COT，要求细节清晰，逻辑严谨
2.
3.

现在：请严格遵守<角色>和<规则>，执行<工作流程>1
"""""

# 优化模式：
- 整张提示词优化：当用户没有提供“需要替换的选中片段”时，读取当前完整提示词和用户优化要求，输出一份完整的新提示词。
- 局部选中文本优化：当用户提供“需要替换的选中片段”时，读取完整提示词作为上下文，只优化选中的片段，最终只输出替换片段本身。
- 整张提示词优化必须严格套用<标准提示词框架>。
- 局部选中文本优化必须参考<标准提示词框架>，但不能输出完整框架，只能输出选中片段的新文本。

# 例子：
- 当<工作流程>判断任务是整张提示词优化，且用户要求是“帮我写一个短视频脚本生成提示词”时，可以参考以下结构：
  - <角色>应设定为短视频脚本策划专家。
  - <规则>应包含禁止空泛表达、必须贴合平台语境、必须明确受众和视频目标。
  - <工作流程>应包含理解主题、拆解受众、设计开头钩子、组织脚本结构、检查输出格式。
- 当<工作流程>判断任务是局部选中文本优化，且选中片段是“你是一个助手”，用户要求是“更专业”时，可以把片段优化成：
  - 你是资深内容策略专家，擅长把模糊需求拆解成可执行的内容方案。
- 当<工作流程>判断当前卡片为空，且用户只给出需求时，必须根据用户需求从零生成完整<标准提示词框架>。

# 输出格式：
- 整张提示词优化时，最终只输出一份完整 Markdown 提示词。
- 局部选中文本优化时，最终只输出优化后的选中片段。
- 最终输出不得包含解释、寒暄、分析过程、代码块围栏。
- 最终输出不得包含“优化后如下”“以下是”等引导语。
- 整张提示词优化的最终输出必须能直接作为完整提示词卡片保存。
- 局部选中文本优化的最终输出必须能直接替换原选中文本。
- 如果最终输出是完整提示词，必须严格符合<标准提示词框架>。
- 如果最终输出是局部片段，必须保持原片段所在位置的 Markdown 层级、列表编号、缩进和语气。
- 最终的提示词不要出现“可选”两个字

# 工作流程:
深呼吸一口气，请逐步思考和推理接下来的每一个步骤，禁止跳过任何一个步骤：
1. 判断当前任务属于<优化模式>中的整张提示词优化，还是局部选中文本优化。
2. 如果是整张提示词优化，读取用户要求和当前提示词内容，吸收有效信息，严格按照<标准提示词框架>重写完整提示词。
3. 如果是局部选中文本优化，读取完整提示词上下文，判断选中片段在<标准提示词框架>中的位置和作用，只重写选中片段。
4. 必要时参考<例子>，但不能照抄与用户任务无关的示例内容。
5. 检查整张优化结果是否完整遵守<标准提示词框架>，尤其检查一级标题、<输出格式>开头句、<工作流程>和最后“现在”语句。
6. 检查局部优化结果是否只包含替换片段，禁止夹带完整<标准提示词框架>或解释文本。
7. 按<输出格式>输出最终可直接回填的 Markdown 内容。

现在：请严格遵守<角色>和<规则>，执行<工作流程>1`

export const FLOWCHART_MODEL_SETTINGS_ID = 'flowchart-model'
export const FLOWCHART_ASSISTANT_NAME = '流程图生成助手'
export const FLOWCHART_ASSISTANT_PROMPT = `# 角色：
- 你是流程图结构生成专家，专门负责把用户的零散需求、业务说明、流程描述，转换成可以直接渲染到画布上的结构化流程图 JSON。
- 你是严格的信息架构师，只能使用步骤节点和提示词节点组织流程。
- 你是谨慎的画布编排专家，必须让步骤从上到下顺序清晰，输出结果稳定可解析。

# 规则：
- 最终只能输出 JSON，禁止输出解释、寒暄、分析过程、Markdown 代码块围栏。
- JSON 只能包含 nodes 和 edges 两个顶层字段。
- nodes 里的节点 kind 只能是 step、prompt。
- 禁止生成 decision、condition、branch 等判断节点。
- step 节点必须有 title 和 body。
- step 节点 title 必须以两位序号开头，格式为【01】、【02】、【03】。
- prompt 节点表示该步骤可能用到的智能体提示词卡片，只写标题和生成要求，不写完整提示词正文。
- 每个 step 节点可按实际需要连接多个 prompt 节点，可以没有 prompt 节点，不设置数量上限。
- 如果一个步骤包含多个智能体，必须为每个明确需要独立工作的智能体生成对应 prompt 节点，不要因为数量多而合并或省略。
- edges 只需要表达 step 到 prompt 的从属关系；主流程步骤顺序由系统自动按 nodes 中 step 顺序连接。
- 禁止输出 step 到 step 的复杂多重关系；复杂关系写进对应 step 的 body。
- edges 只能连接 nodes 中已经存在的 id，且只能从 step 指向 prompt。
- 禁止编造事实、数据、资质、案例；没有依据的内容只能写成通用流程要求。

# 流程图 JSON 结构：
- nodes 是节点数组，每个节点必须包含 id、kind、title、body。
- prompt 节点必须额外包含 promptInstruction，用来描述后续提示词优化模型要生成什么提示词。
- edges 是连线数组，每条连线必须包含 sourceId、targetId。
- id 必须使用稳定英文小写、数字和短横线，禁止中文和空格。

# 输出格式：
- 最终只输出一份 JSON 对象。
- JSON 示例结构如下：
{
  "nodes": [
    {
      "id": "step-01",
      "kind": "step",
      "title": "【01】需求理解",
      "body": "- 梳理用户目标\\n- 确认输入材料\\n- 记录关键约束"
    },
    {
      "id": "prompt-01",
      "kind": "prompt",
      "title": "需求分析提示词",
      "body": "用于分析用户需求的智能体提示词。",
      "promptInstruction": "生成一个需求分析智能体提示词，要求能识别目标、输入、约束和缺失信息。"
    }
  ],
  "edges": [
    { "sourceId": "step-01", "targetId": "prompt-01" }
  ]
}

# 工作流程:
深呼吸一口气，请逐步思考和推理接下来的每一个步骤，禁止跳过任何一个步骤：
1. 读取用户需求和当前画布上下文，判断用户是从零生成流程，还是基于现有画布继续补充流程。
2. 把用户需求拆解成有先后顺序的步骤节点，并为步骤节点添加【01】这样的两位序号。
3. 把分支、判断、复杂关系写入对应步骤 body，禁止新增判断节点。
4. 判断每个步骤是否需要提示词节点；如果需要，按实际智能体数量生成对应提示词节点，不设置数量上限。
5. 为每个提示词节点写清楚 promptInstruction，方便后续提示词优化模型生成完整提示词卡片。
6. 只为 step 到 prompt 的从属关系建立 edges，主流程顺序不需要输出复杂连线。
7. 检查 JSON 是否能被严格解析，禁止输出 JSON 之外的任何文字。

现在：请严格遵守<角色>和<规则>，执行<工作流程>1`

const FLOWCHART_LEGACY_PROMPT_LIMIT_PATTERNS = [
  /每个 step 节点最多连接\s*3\s*个 prompt 节点/,
  /超过\s*3\s*个智能体/,
  /最多生成\s*3\s*个最关键的提示词节点/,
]

const FLOWCHART_LEGACY_PROMPT_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /每个 step 节点最多连接\s*3\s*个 prompt 节点，可以没有 prompt 节点。/g,
    '每个 step 节点可按实际需要连接多个 prompt 节点，可以没有 prompt 节点，不设置数量上限。',
  ],
  [
    /如果一个步骤包含超过\s*3\s*个智能体，只选择最关键的\s*3\s*个生成 prompt 节点，其余智能体写入对应 step 的 body。/g,
    '如果一个步骤包含多个智能体，必须为每个明确需要独立工作的智能体生成对应 prompt 节点，不要因为数量多而合并或省略。',
  ],
  [
    /4\. 判断每个步骤是否需要提示词节点；如果需要，最多生成\s*3\s*个最关键的提示词节点。/g,
    '4. 判断每个步骤是否需要提示词节点；如果需要，按实际智能体数量生成对应提示词节点，不设置数量上限。',
  ],
]

export interface EnabledModelOption {
  id: string
  providerId: string
  modelId: string
  label: string
  providerName: string
  modelName: string
}

export function createDefaultModelSettings(
  updates: Partial<DefaultModelSettings> = {},
): DefaultModelSettings {
  const at = nowIso()

  return normalizeDefaultModelSettings({
    id: DEFAULT_MODEL_SETTINGS_ID,
    assistantName: DEFAULT_ASSISTANT_NAME,
    prompt: DEFAULT_ASSISTANT_PROMPT,
    thinkingMode: 'off',
    createdAt: at,
    updatedAt: at,
    ...updates,
  })
}

export function createFlowchartModelSettings(
  updates: Partial<DefaultModelSettings> = {},
): DefaultModelSettings {
  const at = nowIso()

  return normalizeDefaultModelSettings({
    id: FLOWCHART_MODEL_SETTINGS_ID,
    assistantName: FLOWCHART_ASSISTANT_NAME,
    prompt: FLOWCHART_ASSISTANT_PROMPT,
    thinkingMode: 'off',
    createdAt: at,
    updatedAt: at,
    ...updates,
  })
}

export function normalizeDefaultModelSettings(
  settings: DefaultModelSettings,
): DefaultModelSettings {
  const defaults = getDefaultModelProfile(settings.id)
  const prompt = settings.prompt.trim()

  return {
    ...settings,
    id: settings.id || defaults.id,
    providerId: settings.providerId?.trim() || undefined,
    modelId: settings.modelId?.trim() || undefined,
    assistantName: settings.assistantName.trim() || defaults.assistantName,
    prompt: normalizeDefaultPrompt(settings.id, prompt, defaults.prompt),
    thinkingMode: normalizeDefaultThinkingMode(settings.thinkingMode),
  }
}

export function deriveEnabledModelOptions(
  providers: ProviderConfig[],
): EnabledModelOption[] {
  return providers.flatMap((provider) => {
    const normalized = normalizeProviderConfig(provider)
    if (!normalized.enabled) return []

    return (normalized.models ?? [])
      .filter((model) => model.enabled)
      .map((model) => createModelOption(normalized, model))
  })
}

export function resolveDefaultModelOption(
  settings: DefaultModelSettings | undefined,
  options: EnabledModelOption[],
) {
  return options.find(
    (option) =>
      option.providerId === settings?.providerId &&
      option.modelId === settings?.modelId,
  )
}

export function resolveDefaultModelProvider(
  providers: ProviderConfig[],
  settings?: DefaultModelSettings,
): ProviderConfig | undefined {
  if (!settings?.providerId || !settings.modelId) return undefined
  const provider = providers
    .map(normalizeProviderConfig)
    .find((item) => item.enabled && item.id === settings.providerId)
  const model = provider?.models?.find(
    (item) => item.enabled && item.id === settings.modelId,
  )

  return provider && model
    ? {
        ...provider,
        id: buildSelectableProviderId(provider.id, model.id),
        sourceProviderId: provider.id,
        name: `${provider.name} · ${model.name || model.id}`,
        model: model.id,
      }
    : undefined
}

export function appendDefaultAssistantPrompt(
  compiledPrompt: string,
  defaultPrompt?: string,
) {
  const prompt = defaultPrompt?.trim()
  if (!prompt) return compiledPrompt
  if (!compiledPrompt.trim()) return prompt
  return `${prompt}\n\n${compiledPrompt}`
}

export function upgradeLegacyFlowchartAssistantPrompt(prompt: string) {
  if (!FLOWCHART_LEGACY_PROMPT_LIMIT_PATTERNS.some((pattern) => pattern.test(prompt))) {
    return prompt
  }

  return FLOWCHART_LEGACY_PROMPT_REPLACEMENTS.reduce(
    (nextPrompt, [pattern, replacement]) => nextPrompt.replace(pattern, replacement),
    prompt,
  )
}

function createModelOption(
  provider: ProviderConfig,
  model: ProviderModelConfig,
): EnabledModelOption {
  const modelName = model.name || model.id

  return {
    id: buildSelectableProviderId(provider.id, model.id),
    providerId: provider.id,
    modelId: model.id,
    label: `${modelName} · ${provider.name}`,
    providerName: provider.name,
    modelName,
  }
}

function normalizeDefaultThinkingMode(mode?: ThinkingMode): ThinkingMode {
  return mode && ['auto', 'off', 'light', 'on', 'deep'].includes(mode)
    ? mode
    : 'off'
}

function normalizeDefaultPrompt(id: string, prompt: string, fallbackPrompt: string) {
  if (!prompt) return fallbackPrompt
  if (id === FLOWCHART_MODEL_SETTINGS_ID)
    return upgradeLegacyFlowchartAssistantPrompt(prompt)
  return prompt
}

function getDefaultModelProfile(id?: string) {
  return id === FLOWCHART_MODEL_SETTINGS_ID
    ? {
        id: FLOWCHART_MODEL_SETTINGS_ID,
        assistantName: FLOWCHART_ASSISTANT_NAME,
        prompt: FLOWCHART_ASSISTANT_PROMPT,
      }
    : {
        id: DEFAULT_MODEL_SETTINGS_ID,
        assistantName: DEFAULT_ASSISTANT_NAME,
        prompt: DEFAULT_ASSISTANT_PROMPT,
      }
}
