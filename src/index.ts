/**
 * dsh-model-visibility — Host half.
 *
 * Owns the `model-visibility` settings namespace (the hidden-model list) and
 * filters the model catalog at its source: `ctx.llm.listModels` is wrapped
 * so every catalog read (the conversation selector's
 * `remote.session.modelCatalog()` and the settings page) stops advertising
 * hidden models. Catalog membership
 * is advisory in the harness, so hiding a model a session already uses
 * never breaks that session's dispatch.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: resolves `ctx.llm` (LlmRuntime) on Context.
import type {} from '@deepseek-ai/dsh-llm'
// Type-only: resolves `ctx.settings` (SettingsProvider) on Context.
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { MODEL_VISIBILITY_NS } from './namespace.ts'

export const name = 'dsh-model-visibility'
export const inject = ['llm', 'settings'] as const

export { MODEL_VISIBILITY_NS }

/** One hidden model: the provider/model route pair plus a display-name snapshot. */
export interface HiddenModel {
  provider: string
  model: string
  /** Display name captured when hidden, so the card can label the row after the catalog stops advertising it. */
  name?: string
}

export interface Config {
  /** Models excluded from the model-selector catalog; empty means all visible. */
  hidden: HiddenModel[]
}

export const Config: z<Config> = z.object({
  hidden: z.array(z.object({
    provider: z.string().required(),
    model: z.string().required(),
    name: z.string(),
  })).default([]),
})

export function apply(ctx: Context, config: Config): void {
  // 0.1.5 replaced the `installSettingsSection` helper with the provider's own
  // `register`: the entry config is the composition base, the returned scope
  // reads the resolved (base → user document) value and is disposed with this
  // fiber. The filter below reads `scope.get()` live on every listModels call,
  // so a committed change needs no rebuild here.
  const scope = ctx.settings.register(MODEL_VISIBILITY_NS, Config, { base: config })

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
          scope.get().hidden
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
