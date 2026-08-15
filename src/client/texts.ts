/**
 * dsh-fork-to-workspace — 客户端文案（zh/en 小字典）。
 * 不依赖 locale 服务：菜单/对话框都是 DOM 增强注入的临时 UI，按页面语言
 * 取一套文案即可。
 */

/** 页面是否为英文界面（决定取哪套文案）。 */
function isEnglish(): boolean {
  return (document.documentElement.lang ?? '').toLowerCase().startsWith('en')
}

/** 字典：zh 为主，en 兜底。 */
const DICT: Record<string, { zh: string; en: string }> = {
  'menu.forkToWorkspace': {
    zh: '分叉会话到其他工作区…',
    en: 'Fork session to another workspace…',
  },
  'branch.menuTitle': {
    zh: '克隆此会话分支',
    en: 'Clone this session branch',
  },
  'branch.toCurrent': {
    zh: '克隆到当前工作区',
    en: 'Clone to current workspace',
  },
  'branch.toOther': {
    zh: '克隆到其他工作区…',
    en: 'Clone to another workspace…',
  },
  'branch.enabledTip': {
    zh: '克隆此轮分支（选择克隆方式）',
    en: 'Clone this branch (choose how to clone)',
  },
  'branch.noSession': {
    zh: '无法确定当前会话，请重试',
    en: 'Cannot determine the current session. Please retry.',
  },
  'dialog.title': {
    zh: '分叉会话到其他工作区',
    en: 'Fork session to another workspace',
  },
  'dialog.source': {
    zh: '源会话：{name}',
    en: 'Source session: {name}',
  },
  'dialog.workspace': {
    zh: '目标工作区（点击选择）',
    en: 'Target workspace (click to select)',
  },
  'dialog.noOtherWorkspace': {
    zh: '没有其他可用的工作区。请先在左侧「添加工作区」后再试。',
    en: 'No other workspace available. Add one in the sidebar first.',
  },
  'dialog.cancel': {
    zh: '取消',
    en: 'Cancel',
  },
  'dialog.confirm': {
    zh: '克隆到该工作区',
    en: 'Clone to this workspace',
  },
  'dialog.forking': {
    zh: '正在克隆…',
    en: 'Cloning…',
  },
  'dialog.opening': {
    zh: '已克隆，正在打开…',
    en: 'Cloned. Opening…',
  },
  'dialog.failed': {
    zh: '克隆失败：{message}',
    en: 'Fork failed: {message}',
  },
  'dialog.loadFailed': {
    zh: '无法加载工作区列表：{message}',
    en: 'Failed to load workspaces: {message}',
  },
  'dialog.resolveFailed': {
    zh: '无法确定源会话。请在左侧会话列表中先选择要克隆的会话，再打开它的菜单重试。',
    en: 'Cannot identify the source session. Select it in the sidebar list first, then open its menu again.',
  },
}

/** 取一条文案（支持 {key} 变量替换）。 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key]
  let text = entry === undefined ? key : isEnglish() ? entry.en : entry.zh
  if (vars !== undefined) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
