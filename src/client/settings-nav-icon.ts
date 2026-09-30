/**
 * The eye glyph in the settings navigation.
 *
 * The settings shell picks nav glyphs from a closed list of section ids
 * (`account`, `models`, `agent-presets`, `plugins`, `archived-sessions`) and
 * falls back to its own gear for every other id; `settings.section` projects
 * only `id` / `order` / `label`, so a registrant has no icon to pass — the
 * slot contract in `@deepseek-ai/dsh-client-ui-settings` and the runtime
 * slot inventory both list exactly those options. Every third-party section
 * therefore wears the gear, this one included.
 *
 * So this card claims its own row once the dialog is mounted and swaps the
 * fallback gear for an eye — the same glyph the feature is about. The
 * approach follows the precedent set by `dshmarket` (and credited there to
 * `dsh-better-sidebar` / `dsh-skill-mcp-panel`).
 *
 * Scope, deliberately narrow:
 *
 * - only the row whose visible text equals this plugin's own localized
 *   section label is marked; no shell structure is touched;
 * - the marker and the injected stylesheet belong to a `ctx.effect`, so they
 *   are removed with the fiber;
 * - a locale switch re-claims the row through the MutationObserver, so the
 *   label and the glyph never disagree.
 *
 * Delete this module (and its call in index.ts) the day `settings.section`
 * grows an `icon` field.
 */

/** Marks the one nav row this plugin owns. */
export const NAV_ICON_MARKER = 'data-dsh-model-visibility-nav-icon'

/**
 * The nav rows of the settings dialog. The shell renders each
 * `settings.section` entry as a `<button>` inside the panel's `<nav>`
 * (SettingsPanel in dsh-client-ui-settings-general).
 */
export const NAV_ROW_SELECTOR = '[role="dialog"] nav button'

/**
 * Glyph box in px. The shell renders every nav icon at this size and ships no
 * media query at all, so there is deliberately no narrow variant here.
 */
export const NAV_ICON_SIZE = 16

/**
 * The eye as standalone SVG for a CSS `mask-image`.
 *
 * Painted pure black on purpose: a mask reads alpha only, and the visible
 * colour comes from the element's `background-color: currentColor`, which
 * keeps the glyph in step with the shell's own icons on hover/active state.
 * The shape is the classic outline eye (almond contour + iris) on a 24 grid;
 * `mask-size` scales it down to the shell's 16px box.
 */
export function eyeMaskSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"'
    + ' stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0'
    + ' 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>'
    + '<circle cx="12" cy="12" r="3"/>'
    + '</svg>'
}

/** The mask URL for the glyph (encoded at runtime, never hand-escaped). */
export function eyeMaskUrl(svg: string = eyeMaskSvg()): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Whether a nav row is this plugin's own.
 *
 * Pure, and the only decision this feature makes: the row whose visible text
 * is the section label the shell is currently projecting. An empty label
 * matches nothing — a locale that has not resolved yet must not mark the
 * whole nav.
 */
export function isOwnNavRow(rowText: string | null | undefined, wantedLabel: string | null | undefined): boolean {
  const wanted = String(wantedLabel ?? '').trim()
  if (wanted.length === 0) return false
  return String(rowText ?? '').trim() === wanted
}

/** Stylesheet for the marked row: hide the shell's gear, draw the eye. */
export function navIconCss(maskUrl: string): string {
  return [
    `[${NAV_ICON_MARKER}] > svg { display: none; }`,
    `[${NAV_ICON_MARKER}]::before {`,
    `  content: '';`,
    `  flex: none;`,
    `  width: ${NAV_ICON_SIZE}px;`,
    `  height: ${NAV_ICON_SIZE}px;`,
    `  background-color: currentColor;`,
    `  -webkit-mask-image: url("${maskUrl}");`,
    `  mask-image: url("${maskUrl}");`,
    `  -webkit-mask-repeat: no-repeat;`,
    `  mask-repeat: no-repeat;`,
    `  -webkit-mask-position: center;`,
    `  mask-position: center;`,
    `  -webkit-mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `  mask-size: ${NAV_ICON_SIZE}px ${NAV_ICON_SIZE}px;`,
    `}`,
  ].join('\n')
}

/** The slice of the client context this feature needs. */
export interface NavIconContext {
  effect(callback: () => unknown, label?: string): void
}

/**
 * Install the nav glyph.
 *
 * @param ctx - client context, for effect ownership.
 * @param resolveLabel - this plugin's current section label (the same thunk
 *   the `settings.section` registration passes), re-read on every sync so a
 *   locale switch is picked up without re-registering.
 */
export function installSettingsNavIcon(ctx: NavIconContext, resolveLabel: () => string): void {
  if (typeof document === 'undefined') return

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-model-visibility'
    tag.dataset.pluginCss = 'dsh-model-visibility/settings-nav-icon'
    tag.textContent = navIconCss(eyeMaskUrl())
    document.head.appendChild(tag)

    let disposed = false
    let scheduled = false

    const sync = () => {
      scheduled = false
      if (disposed) return
      const wanted = resolveLabel()
      for (const row of document.querySelectorAll(NAV_ROW_SELECTOR)) {
        if (isOwnNavRow(row.textContent, wanted)) row.setAttribute(NAV_ICON_MARKER, '')
        else row.removeAttribute(NAV_ICON_MARKER)
      }
    }

    // Coalesce a burst of DOM mutations into one sync, and land it before the
    // next paint so the row never shows the gear first.
    const schedule = () => {
      if (scheduled || disposed) return
      scheduled = true
      queueMicrotask(sync)
    }

    sync()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      disposed = true
      observer.disconnect()
      for (const row of document.querySelectorAll(`[${NAV_ICON_MARKER}]`)) row.removeAttribute(NAV_ICON_MARKER)
      tag.remove()
    }
  }, 'model-visibility: settings nav icon')
}
