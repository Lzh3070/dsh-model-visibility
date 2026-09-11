/**
 * Shared settings namespace of the model-visibility plugin. Lives in its own
 * module so the browser half can name the namespace without value-importing
 * the Host half (which would drag the settings schema and its Node-side deps
 * into the client bundle).
 */
export const MODEL_VISIBILITY_NS = 'model-visibility'
