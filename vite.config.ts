import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    // wgsl_reflect 1.6.0 ships a CommonJS "main" behind "type": "module",
    // so Node resolves the broken wgsl_reflect.node.js. Point to the ESM build.
    alias: [{ find: /^wgsl_reflect$/, replacement: 'wgsl_reflect/wgsl_reflect.module.js' }],
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
