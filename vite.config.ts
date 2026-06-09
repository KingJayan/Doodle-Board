import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

const NODE_BUILTINS = new Set([
  'module', 'url', 'path', 'fs', 'os', 'crypto', 'perf_hooks',
  'node:module', 'node:url', 'node:path', 'node:fs', 'node:os', 'node:crypto', 'node:perf_hooks'
]);

const PATH_STUB = `
  const s = () => '';
  const posix = { join: s, resolve: s, dirname: s, basename: s, extname: s, normalize: s };
  export default { join: s, resolve: s, dirname: s, basename: s, extname: s, posix };
  export const join = s, resolve = s, dirname = s, basename = s, extname = s;
  export { posix };
`;

function fixAnalogPlugin(plugins: any): any {
  if (Array.isArray(plugins)) return plugins.map(fixAnalogPlugin);
  const p = plugins;
  if (p?.name === 'analogjs-router-optimization' && p.transform?.handler) {
    const { handler, filter } = p.transform;
    const re = filter?.id ?? /fesm(.*?)\.mjs/;
    p.transform = { ...p.transform, handler(code: string, id: string, ...a: any[]) {
      if (id && !id.split('?')[0].match(re)) return null;
      return handler.apply(this, [code, id, ...a]);
    }};
  }
  return p;
}

export default defineConfig({
    plugins: [
      {
        name: 'browser-stubs',
        enforce: 'pre',
        resolveId(id) {
          if (NODE_BUILTINS.has(id)) return `\0stub:${id}`;
          if (id.includes('@angular/compiler-cli')) return { id: '\0stub:compiler-cli', external: false };
          if (id.includes('vite/dist/node/')) return '\0stub:vite-internal';
          return undefined;
        },
        load(id) {
          if (!id.startsWith('\0stub:')) return;
          if (id.includes(':path')) return PATH_STUB;
          return 'export default {};';
        }
      },
      ...fixAnalogPlugin(angular({ jit: false }))
    ],
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        external: (id) => id.includes('vite/dist/node/chunks/')
      },
      commonjsOptions: {
        exclude: [/vite\/dist\/node\/chunks/, /vite\/dist\/node\/index\.js/, /@angular\/compiler-cli/],
        transformMixedEsModules: true
      }
    },
    optimizeDeps: { exclude: ['vite', '@angular/compiler-cli'] }
});
