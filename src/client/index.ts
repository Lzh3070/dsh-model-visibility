/**
 * dsh-model-visibility — browser half.
 *
 * Registers the model-visibility card as a top-level settings section
 * (`settings.section`) and its locale dictionaries. Cross-plugin
 * collaboration goes through cordis services only: the slot key's
 * declaration, the settings scope, and the wire handle arrive as type-only
 * merges, never value imports (the loader bundle-purity rule).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only merges: ctx.settingsScope (settings), ctx.locale (locale), and the
// `settings.section` slot declaration (ui-settings).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { Config } from '../index.ts'
import { MODEL_VISIBILITY_NS } from '../namespace.ts'
import {
  ModelVisibilityCardController,
  type ModelCatalogReader,
  type ModelCatalogRemote,
} from './controller.ts'
import { ModelVisibilityCard } from './ModelVisibilityCard.tsx'
import { LOCALE_NS, en, zh } from './locales.ts'

export const name = 'dsh-model-visibility'
// `remote.session` carries the Host model catalog; `settingsScope` is the
// durable hidden-list scope; `slots`/`locale` are the contribution surfaces.
export const inject = ['slots', 'locale', 'settingsScope', 'remote', 'remote.session'] as const

export function apply(ctx: Context): void {
  ctx.locale.register(LOCALE_NS, { zh, en })

  const scope = ctx.settingsScope.bind<Config>({ namespace: MODEL_VISIBILITY_NS })
  // The assembled Remote service is typed through the api-remotes package; the
  // 0.1.5 build mangles its catalog interface name, so narrow to the wire shape
  // this plugin consumes instead of importing that declaration chain.
  const remote = (ctx as unknown as { remote: ModelCatalogRemote }).remote
  const catalog: ModelCatalogReader = {
    async read() {
      const response = await remote.session.modelCatalog()
      if (!response.ok) {
        throw new Error(`${response.error.code}: ${response.error.message}`)
      }
      return response.value.groups
    },
  }
  const controller = new ModelVisibilityCardController(scope, catalog)
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
