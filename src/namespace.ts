/**
 * Shared settings namespace of the model-visibility plugin. Lives in its own
 * module so the browser half can name the namespace without value-importing
 * the Host half (which would drag the settings schema and its Node-side deps
 * into the client bundle).
 */
import type { HiddenModel } from './index.ts'

export const MODEL_VISIBILITY_NS = 'model-visibility'

/**
 * The settings section the browser card edits: the JSON projection of the
 * Host `Config` section as the Settings describe mirror serves it (volatile
 * references are unwrapped into plain data at the form boundary).
 */
export interface VisibilitySection {
  /** Models excluded from the model-selector catalog; absent means all visible. */
  hidden?: HiddenModel[]
}
