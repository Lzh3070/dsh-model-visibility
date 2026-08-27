/**
 * The model-visibility card's controller: React-free state over two sources —
 * the (already filtered) Host model catalog and the `model-visibility`
 * settings scope. The rendered list is their union: catalog rows are visible
 * models; hidden entries restate the models the filter removed, labeled by
 * the name snapshot each entry carries. Beyond the reference shape, the
 * controller exposes provider-level batch writes and a whole-list write so
 * the card can offer search + bulk actions.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { IApiClient, ModelProviderGroup, RpcRequest } from '@deepseek-ai/dsh-client-connection/client'
import type { Config, HiddenModel } from '../index.ts'

/** One toggle row. */
export interface ModelRow {
  id: string
  name: string
  hidden: boolean
}

/** One provider group of rows. */
export interface ProviderGroupRow {
  id: string
  name: string
  models: ModelRow[]
}

/** What the card renders. */
export interface ModelVisibilityState {
  phase: 'loading' | 'ready' | 'error'
  error?: string
  /** Whether the Host settings document accepts writes. */
  writable: boolean
  groups: ProviderGroupRow[]
  /** Union count and how many of them remain visible. */
  total: number
  visible: number
}

/** The face the slot registration injects into the card component. */
export interface ModelVisibilityFace {
  hooks: {
    /** Card snapshot bound by the renderer as useModelVisibility. */
    modelVisibility: SnapshotStore<ModelVisibilityState>
  }
  /** Flip one model's visibility. */
  toggle: (provider: string, model: string, name: string, hidden: boolean) => void
  /** Hide or show every model of one provider. */
  toggleProvider: (provider: string, hidden: boolean) => void
  /** Clear the hidden list entirely (everything visible again). */
  resetAll: () => void
  /** Re-read the catalog after a failure. */
  reload: () => void
}

const EMPTY: ModelVisibilityState = { phase: 'loading', writable: false, groups: [], total: 0, visible: 0 }

/** Mint one wire id (the brand is client-side nominal typing only). */
function rpcRequest<P>(payload: P): RpcRequest<P> {
  return { rpcId: crypto.randomUUID(), payload } as RpcRequest<P>
}

export class ModelVisibilityCardController {
  /** Exposed: the section contribution passes the store through its face as `hooks.snapshot`. */
  readonly store = createSnapshotStore<ModelVisibilityState>(EMPTY)
  private catalog: ModelProviderGroup[] | undefined
  private loadError: string | undefined
  private generation = 0

  constructor(
    private readonly scope: SettingsScope<Config>,
    private readonly api: Pick<IApiClient, 'llm'>,
  ) {
    scope.subscribe(() => { this.recompute() })
    void this.load()
  }

  /** The registration-side inject face. */
  face(): ModelVisibilityFace {
    return {
      hooks: { modelVisibility: this.store },
      toggle: (provider, model, name, hidden) => { void this.toggle(provider, model, name, hidden) },
      toggleProvider: (provider, hidden) => { void this.toggleProvider(provider, hidden) },
      resetAll: () => { void this.resetAll() },
      reload: () => { void this.load() },
    }
  }

  /** Re-read the catalog; an older response never overwrites a newer one. */
  async load(): Promise<void> {
    const generation = ++this.generation
    if (this.catalog === undefined) this.store.update((draft) => { draft.phase = 'loading' })
    try {
      const response = await this.api.llm.models(rpcRequest({}))
      if (generation !== this.generation) return
      if (response.result.ok) {
        this.catalog = response.result.value.groups
        this.loadError = undefined
      } else {
        this.loadError = response.result.error.message
      }
    } catch (error: unknown) {
      if (generation !== this.generation) return
      this.loadError = error instanceof Error ? error.message : String(error)
    }
    this.recompute()
  }

  /** Compute the next hidden list from the current one plus one model's flip. */
  private nextHidden(current: HiddenModel[], provider: string, model: string, name: string, hidden: boolean): HiddenModel[] {
    const rest = current.filter(entry => !(entry.provider === provider && entry.model === model))
    return hidden ? [...rest, { provider, model, name }] : rest
  }

  /** Write the next hidden list, then re-pull the catalog the filter changed. */
  private async write(next: HiddenModel[]): Promise<void> {
    try {
      await this.scope.set('hidden', next)
    } catch {
      // The scope already reloads Host state after a failed latest write;
      // recompute below re-renders whatever the Host now reports.
    }
    await this.load()
  }

  /** Flip one model's visibility (public API — the section card calls it directly). */
  async toggle(provider: string, model: string, name: string, hidden: boolean): Promise<void> {
    const current = this.scope.getSnapshot().value?.hidden ?? []
    await this.write(this.nextHidden(current, provider, model, name, hidden))
  }

  /**
   * Batch flip for one provider. Models are taken from the union of the
   * (filtered) catalog rows and existing hidden entries so a provider with
   * every model already hidden still flips back fully.
   */
  /** Batch flip for one provider (public API). */
  async toggleProvider(provider: string, hidden: boolean): Promise<void> {
    const current = this.scope.getSnapshot().value?.hidden ?? []
    const providerRows = this.stateRows().find(group => group.id === provider)
    const ids = new Set<string>([
      ...providerRows ? providerRows.models.map(model => model.id) : [],
      ...current.filter(entry => entry.provider === provider).map(entry => entry.model),
    ])
    if (ids.size === 0) return
    let next = current.filter(entry => entry.provider !== provider)
    if (hidden) {
      const nameOf = (id: string): string => providerRows?.models.find(model => model.id === id)?.name ?? id
      next = [...next, ...[...ids].map(id => ({ provider, model: id, name: nameOf(id) }))]
    }
    await this.write(next)
  }

  /** Clear the hidden list entirely (public API). */
  async resetAll(): Promise<void> {
    await this.write([])
  }

  /** Current union rows (catalog ∪ hidden) without touching the store. */
  private stateRows(): ProviderGroupRow[] {
    const snapshot = this.scope.getSnapshot()
    const hidden = snapshot.value?.hidden ?? []
    if (this.catalog === undefined) return []
    const hiddenKeys = new Set(hidden.map(entry => `${entry.provider}\u0000${entry.model}`))
    const groups: ProviderGroupRow[] = this.catalog.map(group => ({
      id: group.id,
      name: group.name,
      models: group.models.map(model => ({
        id: model.id,
        name: model.name,
        hidden: hiddenKeys.has(`${group.id}\u0000${model.id}`),
      })),
    }))
    const groupsById = new Map(groups.map(group => [group.id, group]))
    for (const entry of hidden) {
      const group = groupsById.get(entry.provider)
      if (group?.models.some(model => model.id === entry.model)) continue
      const row: ModelRow = { id: entry.model, name: entry.name ?? entry.model, hidden: true }
      if (group !== undefined) {
        group.models.push(row)
      } else {
        const created: ProviderGroupRow = { id: entry.provider, name: entry.provider, models: [row] }
        groupsById.set(entry.provider, created)
        groups.push(created)
      }
    }
    return groups
  }

  /** Union the filtered catalog with the hidden entries into render rows. */
  private recompute(): void {
    const snapshot = this.scope.getSnapshot()
    if (this.catalog === undefined && this.loadError !== undefined) {
      this.store.set({ ...EMPTY, phase: 'error', error: this.loadError, writable: snapshot.writable })
      return
    }
    if (this.catalog === undefined || snapshot.status === 'loading') {
      this.store.set({ ...EMPTY, writable: snapshot.writable })
      return
    }
    const groups = this.stateRows()
    const total = groups.reduce((count, group) => count + group.models.length, 0)
    const visible = groups.reduce(
      (count, group) => count + group.models.filter(model => !model.hidden).length, 0)
    this.store.set({
      phase: 'ready',
      writable: snapshot.writable,
      groups,
      total,
      visible,
    })
  }
}
