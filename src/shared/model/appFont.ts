export interface AppFontOption {
  id: AppFontId
  label: string
  description: string
  fontFamily: string
}

export const APP_FONT_OPTIONS = [
  {
    id: 'source-han-sans',
    label: '思源黑体 / Noto Sans SC',
    description: '现代、清楚、工具感强，适合默认产品界面。',
    fontFamily:
      "'Noto Sans SC', 'Source Han Sans SC', 'Source Han Sans CN', 'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
  {
    id: 'alibaba-puhuiti',
    label: '阿里巴巴普惠体',
    description: '商业产品感更强，适合后台、SaaS 和效率工具。',
    fontFamily:
      "'Alibaba PuHuiTi', 'AlibabaPuHuiTi', '阿里巴巴普惠体', 'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
  {
    id: 'misans',
    label: 'MiSans',
    description: '圆润、精致，科技感比较柔和。',
    fontFamily:
      "'MiSans VF', 'MiSans', 'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
  {
    id: 'harmonyos-sans',
    label: 'HarmonyOS Sans SC / 鸿蒙字体',
    description: '轻盈、系统化，适合干净的应用界面。',
    fontFamily:
      "'HarmonyOS Sans SC', 'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
  {
    id: 'source-han-serif',
    label: '思源宋体 / Noto Serif SC',
    description: '书卷感和专业感更强，适合长文和文档气质。',
    fontFamily:
      "'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', SimSun, '宋体', serif",
  },
  {
    id: 'lxgw-wenkai',
    label: '霞鹜文楷 / LXGW WenKai',
    description: '温柔、自然，带一点手写和阅读气质。',
    fontFamily:
      "'LXGW WenKai', '霞鹜文楷', 'Kaiti SC', KaiTi, '楷体', serif",
  },
  {
    id: 'zhuque-fangsong',
    label: '朱雀仿宋 / Zhuque Fangsong',
    description: '中文排版味道很足，适合更文艺的工具氛围。',
    fontFamily:
      "'Zhuque Fangsong', '朱雀仿宋', FangSong, STFangsong, '仿宋', serif",
  },
  {
    id: 'tsanger-jinkai',
    label: '仓耳今楷',
    description: '高级楷书感明显，适合偏传统、雅致的视觉方向。',
    fontFamily:
      "'TsangerJinKai03-W04', 'TsangerJinKai03', 'TsangerJinKai', '仓耳今楷03-W04', '仓耳今楷03', '仓耳今楷', 'Kaiti SC', KaiTi, '楷体', serif",
  },
  {
    id: 'system-kaiti',
    label: '系统楷体 / Kaiti SC',
    description: '经典楷体风格，传统感强，但不适合特别密集的小字。',
    fontFamily: "'Kaiti SC', STKaiti, KaiTi, '楷体', serif",
  },
  {
    id: 'pingfang-sc',
    label: '苹方 / PingFang SC',
    description: 'macOS 上最稳的现代中文系统字体，克制耐看。',
    fontFamily:
      "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', sans-serif",
  },
] as const

export type AppFontId = (typeof APP_FONT_OPTIONS)[number]['id']

export const defaultAppFontId: AppFontId = 'pingfang-sc'

const appFontOptionsById = new Map<AppFontId, AppFontOption>(
  APP_FONT_OPTIONS.map((option) => [option.id, option]),
)

export function isAppFontId(value: unknown): value is AppFontId {
  return typeof value === 'string' && appFontOptionsById.has(value as AppFontId)
}

export function normalizeAppFontId(value: unknown): AppFontId {
  return isAppFontId(value) ? value : defaultAppFontId
}

export function getAppFontOption(id: AppFontId): AppFontOption {
  return appFontOptionsById.get(id) ?? appFontOptionsById.get(defaultAppFontId)!
}
