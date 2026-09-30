/**
 * Build config reproducing the harness's client-bundle preset for an
 * out-of-repo plugin package (the shared preset is not published):
 * - lib/index.js  — node half, ESM
 * - lib/client.js — browser half, lazy-CJS factory handed to
 *   window.__ModuleLoader__.load({ id, factory }); externals resolve
 *   through the loader's frozen module table (PLATFORM_MODULES).
 */
import type { UserConfig } from 'tsdown'

const ID = 'dsh-model-visibility'

/**
 * Mirror of the 0.2.0 client platform seed table (the `staticModules` map the
 * web shell hands to the module system). Only specifiers actually require()d
 * by the bundle matter (react, react/jsx-runtime and dsh-client-store here);
 * requesting a specifier outside the table aborts the whole plugin tree, so
 * every other dsh package stays a type-only import and gets inlined/erased.
 */
const CLIENT_EXTERNALS = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const nodeHalf: UserConfig = {
  name: ID,
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}

const clientHalf: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  // Everything not in the loader module table must inline.
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [nodeHalf, clientHalf]
