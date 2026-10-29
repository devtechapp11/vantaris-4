import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `vite build` → the real app (Supabase + Razorpay).
// `vite build --mode demo` → a self-contained preview with a local backend.
// The alias swaps the whole backend module, so the real build never contains
// the preview code or the answer key.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? './' : '/',
  resolve: {
    alias: {
      '@api-impl': fileURLToPath(new URL(mode === 'demo' ? './src/lib/api/demo.js' : './src/lib/api/real.js', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: mode === 'demo' ? {} : {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
          return undefined;
        },
      },
    },
  },
  server: { port: 5173 },
}));
