/**
 * Locale dictionaries for the model-visibility settings card.
 * The namespace is merged into the slot system's LocaleNamespaceMap so the
 * register site can declare `locale:` and receive the typed `t` seat.
 */

/** Dictionary keys of this card's copy. */
export type ModelVisibilityLocaleKey =
  | 'nav'
  | 'title'
  | 'intro'
  | 'loading'
  | 'loadFailed'
  | 'retry'
  | 'unavailable'
  | 'empty'
  | 'allHiddenWarning'
  | 'readOnly'
  | 'visibleCount'
  | 'searchPlaceholder'
  | 'noMatch'
  | 'hideAll'
  | 'showAll'
  | 'showAllProviders'
  | 'providerRow'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The model-visibility card's copy. */
    'settings.modelVisibility': ModelVisibilityLocaleKey
  }
}

export const LOCALE_NS = 'settings.modelVisibility' as const

export const zh: Record<ModelVisibilityLocaleKey, string> = {
  nav: '模型可见性',
  title: '模型可见性',
  intro: '控制各模型是否出现在对话界面的模型选择菜单中。隐藏一个正在使用的模型不会中断该会话，也不会改动 Provider 配置。',
  loading: '正在读取模型目录…',
  loadFailed: '模型目录读取失败：{message}',
  retry: '重试',
  unavailable: '此连接不共享宿主设置，模型可见性不可用。',
  empty: '没有任何 Provider 提供模型。',
  allHiddenWarning: '所有模型都已隐藏，模型选择菜单将是空的。',
  readOnly: '设置文档不可写，开关已禁用。',
  visibleCount: '{visible} / {total} 可见',
  searchPlaceholder: '搜索模型…',
  noMatch: '没有匹配的模型。',
  hideAll: '全部隐藏',
  showAll: '全部显示',
  showAllProviders: '恢复全部',
  providerRow: '该渠道 {visible} / {total} 可见',
}

export const en: Record<ModelVisibilityLocaleKey, string> = {
  nav: 'Model visibility',
  title: 'Model visibility',
  intro: 'Control which models appear in the conversation model selector. Hiding a model a session already uses never interrupts that session or touches your provider config.',
  loading: 'Loading the model catalog…',
  loadFailed: 'Failed to load the model catalog: {message}',
  retry: 'Retry',
  unavailable: 'Model visibility is unavailable: this connection does not share the Host settings.',
  empty: 'No provider advertises any model.',
  allHiddenWarning: 'Every model is hidden; the model selector will be empty.',
  readOnly: 'The settings document is read-only; toggles are disabled.',
  visibleCount: '{visible} / {total} visible',
  searchPlaceholder: 'Search models…',
  noMatch: 'No model matches.',
  hideAll: 'Hide all',
  showAll: 'Show all',
  showAllProviders: 'Reset all',
  providerRow: '{visible} / {total} visible in this provider',
}
