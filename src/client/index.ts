/**
 * dsh-model-visibility — browser half.
 *
 * Registers the model-visibility card into the plugin settings section
 * (`settings.plugin.item`) and its locale dictionaries. Cross-plugin
 * collaboration goes through cordis services only: the slot key's
 * declaration, the settings scope, and the wire handle arrive as type-only
 * merges, never value imports (the loader bundle-purity rule).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only merges: ctx.settingsScope, ctx.locale, ctx.slots, and the
// `settings.plugin.item` slot declaration.
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type { Config } from '../index.ts'
import { ModelVisibilityCardController } from './controller.ts'
import { ModelVisibilityCard } from './ModelVisibilityCard.tsx'
import { LOCALE_NS, en, zh } from './locales.ts'

// The published /client types omit the browser-side merge for
// `ctx.connection` (the ConnectionHandle the connection plugin provides);
// restate it locally until the package ships it.
declare module '@deepseek-ai/cordis' {
  interface Context {
    connection: ConnectionHandle
  }
}

export const name = 'dsh-model-visibility'
export const inject = ['slots', 'locale', 'connection', 'settingsScope'] as const

export function apply(ctx: Context): void {
  ctx.locale.register(LOCALE_NS, { zh, en })

  const scope = ctx.settingsScope.bind<Config>({ namespace: 'model-visibility' })
  const controller = new ModelVisibilityCardController(scope, ctx.connection.api)
  // The section card consumes the locale seat through the inject face
  // (mirroring the official Models page, whose face carries `t`).
  const t = ctx.locale.bind(LOCALE_NS)

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
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'model-visibility',
    order: 11,
    label: () => t('nav'),
    inject: injected,
  } as never, ModelVisibilityCard as never))
}
