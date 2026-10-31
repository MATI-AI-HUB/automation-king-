import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx', '../packages/**/*.test.ts'],
    environment: 'node',
  },
});
