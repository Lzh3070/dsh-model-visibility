/**
 * dsh-model-visibility — Host half.
 *
 * Owns the `model-visibility` settings namespace (the hidden-model list) and
 * filters the model catalog at its source: `ctx.llm.listModels` is wrapped
 * so both `session.models` (the conversation selector) and `llm.models`
 * (the settings page) stop advertising hidden models. Catalog membership
 * is advisory in the harness, so hiding a model a session already uses
 * never breaks that session's dispatch.
 */
import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
// Type-only: resolves `ctx.llm` (LlmRuntime) on Context.
import type {} from '@deepseek-ai/dsh-llm'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-model-visibility'
export const inject = ['llm'] as const

/** The settings namespace both halves address (the card keys on it too). */
export const MODEL_VISIBILITY_NS = settingsNamespace('model-visibility')

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
  let source: () => Config = () => config

  installSettingsSection(ctx, MODEL_VISIBILITY_NS, Config, config, {
    setSource: (current) => { source = current },
    // The filter below reads `source()` live on every listModels call,
    // so a committed change needs no rebuild here.
    onChange: () => {},
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
          source().hidden
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
