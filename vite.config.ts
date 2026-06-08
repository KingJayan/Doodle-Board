import { defineConfig, loadEnv } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      {
        name: 'skip-vite-internal-commonjs',
        enforce: 'pre',
        load(id) {
          // Skip commonjs processing for vite's internal files
          if (id.includes('vite/dist/node/chunks/') || id.includes('vite/dist/node/index.js')) {
            return 'export default {};';
          }
        }
      },
      {
        name: 'exclude-compiler-cli',
        enforce: 'pre',
        resolveId(id) {
          // Prevent @angular/compiler-cli from being bundled
          if (id.includes('@angular/compiler-cli')) {
            return { id: '\0compiler-cli-stub', external: false };
          }
        },
        load(id) {
          if (id === '\0compiler-cli-stub') {
            return 'export default {};';
          }
        }
      },
      {
        name: 'polyfill-node-builtins',
        enforce: 'pre',
        resolveId(id) {
          // Provide polyfills for all Node.js built-ins that might be imported
          const nodeBuiltins = [
            'module', 'url', 'path', 'fs', 'os', 'crypto', 'perf_hooks',
            'node:module', 'node:url', 'node:path', 'node:fs', 'node:os', 'node:crypto', 'node:perf_hooks'
          ];
          if (nodeBuiltins.includes(id)) {
            return `\0virtual:${id.replace(':', '-')}-polyfill`;
          }
        },
        load(id) {
          // Module polyfill
          if (id === '\0virtual:module-polyfill' || id === '\0virtual:node-module-polyfill') {
            return 'export function createRequire() { throw new Error("createRequire not available in browser"); }';
          }
          // URL polyfill
          if (id === '\0virtual:url-polyfill' || id === '\0virtual:node-url-polyfill') {
            return 'export function fileURLToPath() { throw new Error("fileURLToPath not available in browser"); }';
          }
          // Path polyfill - must support both default and named exports (import path, { posix } from "path")
          if (id === '\0virtual:path-polyfill' || id === '\0virtual:node-path-polyfill') {
            return `
              const posixStub = {
                join: () => '',
                resolve: () => '',
                dirname: () => '',
                basename: () => '',
                extname: () => '',
                normalize: () => ''
              };
              const pathStub = {
                join: () => '',
                resolve: () => '',
                dirname: () => '',
                basename: () => '',
                extname: () => '',
                posix: posixStub
              };
              export default pathStub;
              export const posix = posixStub;
              export const join = pathStub.join;
              export const resolve = pathStub.resolve;
              export const dirname = pathStub.dirname;
              export const basename = pathStub.basename;
              export const extname = pathStub.extname;
            `;
          }
          // FS polyfill
          if (id === '\0virtual:fs-polyfill' || id === '\0virtual:node-fs-polyfill') {
            return `
              export default {};
              export const readFileSync = () => { throw new Error("readFileSync not available in browser"); };
              export const writeFileSync = () => { throw new Error("writeFileSync not available in browser"); };
              export const existsSync = () => false;
              export const statSync = () => ({ isFile: () => false, isDirectory: () => false });
            `;
          }
          // OS polyfill
          if (id === '\0virtual:os-polyfill' || id === '\0virtual:node-os-polyfill') {
            return `
              export default {};
              export const platform = () => 'browser';
              export const homedir = () => '/';
              export const tmpdir = () => '/tmp';
            `;
          }
          // Crypto polyfill
          if (id === '\0virtual:crypto-polyfill' || id === '\0virtual:node-crypto-polyfill') {
            return `
              export default {};
              export const createHash = () => ({ update: () => ({ digest: () => '' }) });
              export const randomBytes = () => new Uint8Array(0);
            `;
          }
          // Perf hooks polyfill
          if (id === '\0virtual:perf_hooks-polyfill' || id === '\0virtual:node-perf_hooks-polyfill') {
            return `
              export default {};
              export const performance = globalThis.performance || { now: () => Date.now() };
            `;
          }
        }
      },
      angular({
        jit: false
      })
    ],
    build: {
      target: 'esnext',
      minify: 'terser',
      sourcemap: false,
      rollupOptions: {
        external: (id) => {
          // Externalize vite's internal files
          if (id.includes('vite/dist/node/chunks/')) {
            return true;
          }
          return false;
        }
      },
      commonjsOptions: {
        exclude: [/vite\/dist\/node\/chunks/, /vite\/dist\/node\/index\.js/, /@angular\/compiler-cli/],
        transformMixedEsModules: true
      }
    },
    optimizeDeps: {
      exclude: ['vite', '@angular/compiler-cli']
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': JSON.stringify({})
    }
  };
});
