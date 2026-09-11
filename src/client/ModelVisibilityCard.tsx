/**
 * The model-visibility settings section, styled to mirror the official
 * settings pages: big page title + muted intro, a controls row, then one
 * bordered rounded card per provider (like the provider cards on the
 * 模型 page) with pill action buttons and token-style switches.
 *
 * Consumes the `settings.section` contribution contract exactly like the
 * official ModelsSection: props = spread inject face, where `hooks.snapshot`
 * arrives as the `useSnapshot` selector hook; all three seats are undefined
 * while the shell has not injected yet (render null then).
 */
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store'
import type { ModelVisibilityCardController, ModelVisibilityState } from './controller.ts'
import type {} from './locales.ts'

/** Composed props: spread face fields + the `useSnapshot` hook from hooks.snapshot. */
export interface ModelVisibilityCardProps {
  controller: ModelVisibilityCardController | undefined
  useSnapshot: SnapshotSelectorHook<ModelVisibilityState> | undefined
  t: TSeat | undefined
}

/** Localized text seat bound to this card's namespace. */
type TSeat = (key: string, params?: Record<string, unknown>) => string

const STYLE_ID = 'dsh-model-visibility-styles'

const STYLES = `
.dsh-mvw { display:flex; flex-direction:column; gap:16px; }
.dsh-mvw .mvw-title { font-size:20px; font-weight:700; letter-spacing:.01em; }
.dsh-mvw .mvw-sub { font-size:13px; color:inherit; opacity:.62; margin-top:6px; max-width:64ch; line-height:1.55; }
.dsh-mvw .mvw-controls { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:4px; }
.dsh-mvw .mvw-search {
  flex:1 1 220px; min-width:160px; height:38px; padding:0 14px;
  font-size:13px; border-radius:10px;
  border:1px solid rgba(128,128,128,.38);
  background:transparent; color:inherit; outline:none;
}
.dsh-mvw .mvw-search:focus { border-color: rgba(76,139,245,.85); }
.dsh-mvw .mvw-pill {
  height:36px; padding:0 16px; font-size:13px; cursor:pointer;
  border-radius:999px; border:1px solid rgba(128,128,128,.38);
  background:transparent; color:inherit;
}
.dsh-mvw .mvw-pill:hover:not(:disabled) { background:rgba(128,128,128,.08); }
.dsh-mvw .mvw-pill:disabled { opacity:.45; cursor:not-allowed; }
.dsh-mvw .mvw-count { font-size:12.5px; opacity:.62; margin-left:auto; }
.dsh-mvw .mvw-card {
  border:1px solid rgba(128,128,128,.30); border-radius:16px;
  padding:6px 18px 2px;
}
.dsh-mvw .mvw-prov-head {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:12px 0 10px;
}
.dsh-mvw .mvw-prov-name { font-size:15px; font-weight:650; }
.dsh-mvw .mvw-prov-count { font-size:12px; opacity:.55; margin-left:10px; font-weight:400; }
.dsh-mvw .mvw-prov-btns { display:flex; gap:8px; }
.dsh-mvw .mvw-mini {
  height:30px; padding:0 13px; font-size:12.5px; cursor:pointer;
  border-radius:999px; border:1px solid rgba(128,128,128,.38);
  background:transparent; color:inherit;
}
.dsh-mvw .mvw-mini:hover:not(:disabled) { background:rgba(128,128,128,.08); }
.dsh-mvw .mvw-mini:disabled { opacity:.4; cursor:not-allowed; }
.dsh-mvw .mvw-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  min-height:46px; border-top:1px solid rgba(128,128,128,.16);
}
.dsh-mvw .mvw-row:first-of-type { border-top:none; }
.dsh-mvw .mvw-name {
  font-size:14px;
  min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.dsh-mvw .mvw-id {
  opacity:.5; margin-left:8px; padding-right:6px; font-size:12px;
}
.dsh-mvw .mvw-note { font-size:12.5px; opacity:.66; }
.dsh-mvw .mvw-warn { font-size:12.5px; color:#c77700; }
.dsh-mvw .mvw-seats-off { font-size:12.5px; opacity:.66; }
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = STYLES
  document.head.appendChild(el)
}

export function ModelVisibilityCard(props: ModelVisibilityCardProps) {
  const { controller, useSnapshot, t } = props

  // Hooks stay unconditional regardless of injection timing.
  const state = (useSnapshot ?? ((_selector: (s: ModelVisibilityState) => unknown) => undefined))(
    (snapshot: ModelVisibilityState) => snapshot,
  ) as ModelVisibilityState | undefined
  const [query, setQuery] = useState('')

  // Styles must exist before first paint of this subtree; guarded, so idempotent.
  useMemo(() => { ensureStyles() }, [])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return state?.groups ?? []
    return (state?.groups ?? [])
      .map(group => ({
        ...group,
        models: group.models.filter(model =>
          model.id.toLowerCase().includes(q) || model.name.toLowerCase().includes(q) || group.id.toLowerCase().includes(q)),
      }))
      .filter(group => group.models.length > 0)
  }, [state, query])

  if (controller === undefined || useSnapshot === undefined || t === undefined) return null
  if (state === undefined) {
    return (
      <section className="dsh-mvw">
        <div className="mvw-note">{t('loading')}</div>
      </section>
    )
  }

  return (
    <section className="dsh-mvw">
      <div>
        <div className="mvw-title">{t('title')}</div>
        <p className="mvw-sub">{t('intro')}</p>
      </div>

      <div className="mvw-controls">
        <input
          type="search"
          className="mvw-search"
          value={query}
          placeholder={t('searchPlaceholder')}
          onChange={event => { setQuery(event.target.value) }}
        />
        <button
          type="button"
          className="mvw-pill"
          disabled={!state.writable || state.total === state.visible}
          onClick={() => { controller.resetAll() }}
        >
          {t('showAllProviders')}
        </button>
        <span className="mvw-count">{t('visibleCount', { visible: state.visible, total: state.total })}</span>
      </div>

      {state.phase === 'error' && (
        <div className="mvw-warn">
          {t('loadFailed', { message: state.error ?? '' })}{' '}
          <button type="button" className="mvw-mini" onClick={() => { controller.load() }}>{t('retry')}</button>
        </div>
      )}

      {state.phase === 'ready' && !state.writable && <div className="mvw-note">{t('readOnly')}</div>}
      {state.phase === 'ready' && state.groups.length === 0 && <div className="mvw-note">{t('empty')}</div>}
      {state.phase === 'ready' && state.total > 0 && state.visible === 0 && (
        <div className="mvw-warn">{t('allHiddenWarning')}</div>
      )}
      {state.phase === 'ready' && filteredGroups.length === 0 && state.groups.length > 0 && (
        <div className="mvw-note">{t('noMatch')}</div>
      )}

      {state.phase === 'ready' && filteredGroups.map(group => {
        const groupVisible = group.models.filter(model => !model.hidden).length
        return (
          <div key={group.id} className="mvw-card">
            <div className="mvw-prov-head">
              <div>
                <span className="mvw-prov-name">{group.name}</span>
                <span className="mvw-prov-count">
                  {t('providerRow', { visible: groupVisible, total: group.models.length })}
                </span>
              </div>
              <div className="mvw-prov-btns">
                <button
                  type="button"
                  className="mvw-mini"
                  disabled={!state.writable || groupVisible === 0}
                  onClick={() => { controller.toggleProvider(group.id, true) }}
                >
                  {t('hideAll')}
                </button>
                <button
                  type="button"
                  className="mvw-mini"
                  disabled={!state.writable || groupVisible === group.models.length}
                  onClick={() => { controller.toggleProvider(group.id, false) }}
                >
                  {t('showAll')}
                </button>
              </div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.models.map(model => (
                <li key={model.id} className="mvw-row">
                  <span className="mvw-name">
                    {model.name}
                    {model.name !== model.id && <span className="mvw-id">{model.id}</span>}
                  </span>
                  <Switch
                    on={!model.hidden}
                    disabled={!state.writable}
                    label={model.name}
                    onChange={visible => { controller.toggle(group.id, model.id, model.name, !visible) }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function Switch(props: { on: boolean; disabled: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.on}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => { props.onChange(!props.on) }}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        padding: 2,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        background: props.on ? '#4c8bf5' : 'rgba(128,128,128,.45)',
        opacity: props.disabled ? 0.5 : 1,
        display: 'inline-flex',
        justifyContent: props.on ? 'flex-end' : 'flex-start',
        transition: 'background .15s',
        flex: 'none',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </button>
  )
}
