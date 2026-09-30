/**
 * dsh-model-visibility — Host half.
 *
 * Owns the `model-visibility` profile entry (the hidden-model list) and filters
 * the model catalog at its source: `ctx.llm.listModels` is wrapped so every
 * catalog read (the conversation selector's `remote.session.modelCatalog()`
 * and the settings page) stops advertising hidden models. Catalog membership
 * is advisory in the harness, so hiding a model a session already uses never
 * breaks that session's dispatch.
 *
 * 0.2.0 configuration model: the `hidden` field is declared `.volatile()`, so
 * the Settings form projection exposes it to the browser card, and a form
 * write commits the new value into the SAME stable reference (no fiber
 * remount). The filter below reads `config.hidden.get()` on every listModels
 * call, so a committed change takes effect on the next catalog read.
 */
import type { Context } from '@deepseek-ai/cordis'
// The Config schema's volatile output names this type in the emitted
// declarations; import it from its declaring package so the .d.ts stays
// portable under pnpm's isolated layout (cordis re-exports the same type).
import type { Volatile } from '@deepseek-ai/cosmokit'
// Type-only: resolves `ctx.llm` (LlmRuntime) on Context.
import type {} from '@deepseek-ai/dsh-llm'
// Type-only: resolves `ctx.settings` (SettingsForms) on Context for the
// optional auto-page policy below.
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { MODEL_VISIBILITY_NS } from './namespace.ts'

export const name = 'dsh-model-visibility'
export const inject = ['llm'] as const

export { MODEL_VISIBILITY_NS }

/** One hidden model: the provider/model route pair plus a display-name snapshot. */
export interface HiddenModel {
  provider: string
  model: string
  /** Display name captured when hidden, so the card can label the row after the catalog stops advertising it. */
  name?: string
}

/**
 * Runtime plugin config as the Loader parses it: volatile fields arrive as
 * STABLE references whose snapshots the Loader commits form writes into.
 * The browser card edits the JSON projection of this same section, see
 * `VisibilitySection` in namespace.ts.
 */
export interface Config {
  /** Models excluded from the model-selector catalog; empty means all visible. */
  hidden: Volatile<HiddenModel[]>
}

/** Field schemas, named so the const below can state its exact input/output pair. */
const fields = {
  hidden: z.array(z.object({
    provider: z.string().required(),
    model: z.string().required(),
    name: z.string(),
  })).default([]).volatile(),
}

export const Config: z<Schemastery.ObjectS<typeof fields>, Schemastery.ObjectT<typeof fields>> = z.object(fields)

export function apply(ctx: Context, config: Config): void {
  // This plugin ships its own settings page (the browser half's
  // `settings.section` card), so the schema-derived automatic page stays off.
  // The policy rides an OPTIONAL child fiber: a composition without the
  // Settings service still gets the catalog filter below, and a late-loading
  // or replaced Settings service picks the policy up (mirrors the official
  // locale plugin's Host half).
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  // Wrap the runtime's catalog read. An own-property assignment on the
  // service instance shadows the prototype method for every consumer
  // (the api-proxy's buildModelCatalog included); the effect disposer
  // restores the prototype lookup on unload/hot-reload.
  const llm = ctx.llm
  const original = llm.listModels.bind(llm)
  ctx.effect(() => {
    Object.defineProperty(llm, 'listModels', {
      value: async (provider: string) => {
        const models = await original(provider)
        const hidden = new Set(
          config.hidden.get()
            .filter(entry => entry.provider === provider)
            .map(entry => entry.model),
        )
        if (hidden.size === 0) return models
        return models.filter(model => !hidden.has(model.id))
      },
      configurable: true,
      writable: true,
    })
    return () => {
      delete (llm as { listModels?: unknown }).listModels
    }
  }, 'model-visibility: listModels catalog filter')
}
