import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execFileSync } from 'node:child_process';

// The source revision is optional in a ZIP-imported AI Studio workspace.
// Never invent a commit hash when Git metadata is unavailable.
function sourceRevision():string {
  const supplied=process.env.VITE_USV_SOURCE_REVISION || process.env.GITHUB_SHA;
  if(supplied && /^[0-9a-f]{40}$/i.test(supplied))return supplied.toLowerCase();
  try {
    const sha=execFileSync('git',['rev-parse','HEAD'],{
      cwd:import.meta.dirname,encoding:'utf8',stdio:['ignore','pipe','ignore']
    }).trim();
    return /^[0-9a-f]{40}$/i.test(sha)?sha.toLowerCase():'unverified';
  }catch{return 'unverified';}
}

export default defineConfig({
  define: { __USV_SOURCE_REVISION__: JSON.stringify(sourceRevision()) },
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
        dockyard2: path.resolve(import.meta.dirname, 'dockyard2.html'),
        navalAiLab: path.resolve(import.meta.dirname, 'naval-lab.html'),
        navalAtlas: path.resolve(import.meta.dirname, 'atlas.html'),
        engineeringSessions: path.resolve(import.meta.dirname, 'sessions.html')
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
