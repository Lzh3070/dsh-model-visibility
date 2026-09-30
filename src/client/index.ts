/**
 * dsh-model-visibility — browser half.
 *
 * Registers the model-visibility card as a top-level settings section
 * (`settings.section`) and its locale dictionaries. Cross-plugin
 * collaboration goes through cordis services only: the slot key's
 * declaration, the settings scope, and the wire handle arrive as type-only
 * merges, never value imports (the loader bundle-purity rule).
 *
 * 0.2.0: the `settingsScope` service is gone; the card's durable state rides
 * `ctx.configForms` (the shared describe mirror over the Host form
 * projection), and the Remote namespace carries formal types, so the wire
 * shape is no longer restated locally.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only merges: ctx.configForms (ui-settings), ctx.locale (locale),
// ctx.slots (ui-renderer), and the `settings.section` slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: ctx.remote with the formal `session.modelCatalog()` signature.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { MODEL_VISIBILITY_NS, type VisibilitySection } from '../namespace.ts'
import { ModelVisibilityCardController, type ModelCatalogReader } from './controller.ts'
import { ModelVisibilityCard } from './ModelVisibilityCard.tsx'
import { LOCALE_NS, en, zh } from './locales.ts'
import { installSettingsNavIcon } from './settings-nav-icon.ts'

export const name = 'dsh-model-visibility'
// `remote.session` carries the Host model catalog; `configForms` is the
// durable hidden-list form; `slots`/`locale` are the contribution surfaces.
export const inject = ['slots', 'locale', 'configForms', 'remote', 'remote.session'] as const

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'model-visibility: copy dictionaries')

  // The shared form over this plugin's own profile entry (id from
  // cordis.patch.yml); writes serialize through the Host settings document.
  const form = ctx.configForms.get<VisibilitySection>(MODEL_VISIBILITY_NS)
  const catalog: ModelCatalogReader = {
    async read() {
      const response = await ctx.remote.session.modelCatalog()
      if (!response.ok) {
        throw new Error(`${response.error.code}: ${response.error.message}`)
      }
      return response.value.groups
    },
  }
  const controller = new ModelVisibilityCardController(form, catalog)
  ctx.effect(() => () => { controller.dispose() }, 'model-visibility: card controller')

  // Keep the catalog fresh on pushed invalidations (the same channels the
  // official Models page listens to): provider-topology changes, and settings
  // writes — a provider's model-catalog edit (renames included) commits
  // volatile-only, which emits NO adapter event, so the settings document
  // channel is the only signal. Our own hidden-list write already re-reads
  // the catalog, so it is filtered out to avoid a redundant fetch.
  ctx.effect(() => {
    const offAdapters = ctx.remote.$on('llm/adapters-updated', () => { void controller.load() })
    const offSettings = ctx.remote.$on('settings/document-updated', (ns) => {
      if (ns !== MODEL_VISIBILITY_NS) void controller.load()
    })
    return () => {
      offAdapters()
      offSettings()
    }
  }, 'model-visibility: catalog invalidation')

  // The section card consumes the locale seat through the inject face
  // (mirroring the official Models page, whose face carries `t`).
  const t = ctx.locale.bind(LOCALE_NS)

  // The section's nav glyph. The shell picks nav icons from its own built-in
  // list of section ids and falls back to the settings gear, and a
  // `settings.section` registration has no icon to pass — so the card claims
  // its own row and swaps the gear for an eye. Same label thunk as the
  // registration below, so the row is re-claimed when the locale changes.
  installSettingsNavIcon(ctx, () => t('nav'))

  // Register as a top-level settings SECTION (nav entry 「模型可见性」, ordered
  // right after the official 模型 page at order=10) instead of a tab inside
  // the Plugins section — the card is a whole-page surface (search + batch
  // controls read better with room to breathe). The label thunk re-binds the
  // locale each call so a host language switch shows fresh text.
  //
  // Face contract for `settings.section` contributions (ui-slots): every
  // field of the injected object spreads onto the component as props, and
  // each `hooks` entry becomes a `use<Name>` snapshot-selector hook. The
  // component destructures { controller, useSnapshot, t } exactly like the
  // official ModelsSection does.
  const injected = () => ({
    controller,
    t,
    hooks: { snapshot: controller.store },
  })
  // Register the section only while the Host serves this plugin's namespace:
  // a deployment without the Host half shows no trace of the page instead of
  // a card stuck on its loading row.
  ctx.effect(
    () => ctx.configForms.whileServed([MODEL_VISIBILITY_NS], () =>
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'model-visibility',
        order: 11,
        label: () => t('nav'),
        inject: injected,
      } as never, ModelVisibilityCard as never))),
    'model-visibility: settings section',
  )
}
