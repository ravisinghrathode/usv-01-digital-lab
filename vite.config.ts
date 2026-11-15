import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Node-native node:test suites have dedicated GitHub jobs. Do not collect them in Vitest.
  test: { exclude: [...configDefaults.exclude, '**/*.test.mjs'] },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        navalDesignStudio: path.resolve(import.meta.dirname, 'index.html'),
        legacyEngineering: path.resolve(import.meta.dirname, 'legacy.html'),
        dockyard2: path.resolve(import.meta.dirname, 'dockyard2.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('/scheduler/')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('zod')) return 'vendor-zod';
            return 'vendor-libs';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
