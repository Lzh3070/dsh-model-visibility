/**
 * Host-half smoke test (not shipped): boots the built plugin under a bare
 * cordis Context with a stub `llm` service and no Settings service, then
 * checks the volatile config parse, the catalog filter, and the unload
 * restore. Run: node scripts/smoke-host.mjs
 */
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import * as plugin from '../lib/index.js'

const CATALOG = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  minimax: [{ id: 'MiniMax-M3', name: 'MiniMax M3' }],
}

const root = new Context()
// The real LlmRuntime exposes listModels on its PROTOTYPE (class instance);
// the plugin's shadow/restore dance relies on that. Mirror it with a class.
class StubLlm {
  async listModels(provider) {
    return CATALOG[provider] ?? []
  }
}
root.provide('llm', new StubLlm())

// No `settings` service on purpose: the auto-page policy child must stay
// pending without blocking the catalog filter.
const fiber = root.plugin(plugin, {
  hidden: [{ provider: 'deepseek', model: 'deepseek-chat', name: 'DeepSeek Chat' }],
})
await fiber.await()

// The volatile field parses into a stable reference with schema defaults.
const parsed = plugin.Config({ hidden: [] })
assert.equal(typeof parsed.hidden.get, 'function', 'volatile field parses into a reference')

const llm = root.get('llm')

const deepseek = await llm.listModels('deepseek')
assert.deepEqual(deepseek.map(m => m.id), ['deepseek-reasoner'], 'hidden model filtered out')

const minimax = await llm.listModels('minimax')
assert.deepEqual(minimax.map(m => m.id), ['MiniMax-M3'], 'other providers untouched')

// Committing into the running reference (what the Loader does on a form
// write) must be observed by the next catalog read, without a fiber remount.
const { createVolatile, updateVolatile } = await import('@deepseek-ai/cosmokit')
const running = fiber.config.hidden
updateVolatile(running, createVolatile([{ provider: 'minimax', model: 'MiniMax-M3', name: 'MiniMax M3' }]))
const after = await llm.listModels('minimax')
assert.deepEqual(after.map(m => m.id), [], 'in-place volatile commit filters new entries')

// Unload restores the prototype lookup.
await fiber.dispose()
const restored = await root.get('llm').listModels('minimax')
assert.deepEqual(restored.map(m => m.id), ['MiniMax-M3'], 'dispose restores the original catalog')

console.log('smoke-host: all assertions passed')
