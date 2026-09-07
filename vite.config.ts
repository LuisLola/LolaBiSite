import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base relativa: el bundle tambien se sirve desde rutas no-raiz
  base: './',
  build: { outDir: 'dist', sourcemap: false },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
