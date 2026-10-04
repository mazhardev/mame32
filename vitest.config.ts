import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Unit and component tests run in Vitest with jsdom; the site itself is
// built by Next.js (next.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    exclude: ['**/node_modules/**', '**/.next/**', '**/out/**'],
  },
});
