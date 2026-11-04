import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Preload the two font files every screen needs, so text paints in the right
// face on first render (fontsource hashes the names, so this runs after bundling).
const CRITICAL_FONTS = /(inter-latin-opsz-normal|instrument-serif-latin-400-normal)-[\w-]+\.woff2$/;
function preloadFonts(base) {
  return {
    name: 'vantaris-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {});
        const fonts = files
          .filter((file) => CRITICAL_FONTS.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `${base}${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head',
          }));
        // The landing page is the first screen for new visitors: fetch its small
        // chunk in parallel with the app shell instead of after it (~6 KB gzip).
        const landing = files
          .filter((file) => /assets\/Landing-[\w-]+\.js$/.test(file))
          .map((file) => ({ tag: 'link', attrs: { rel: 'modulepreload', href: `${base}${file}`, crossorigin: '' }, injectTo: 'head' }));
        return [...fonts, ...landing];
      },
    },
  };
}

// `vite build` → the real app (Supabase + Razorpay).
// `vite build --mode demo` → a self-contained preview with a local backend.
// The alias swaps the whole backend module, so the real build never contains
// the preview code or the answer key.
export default defineConfig(({ mode }) => {
  const base = mode === 'demo' ? './' : '/';
  return {
    plugins: [react(), preloadFonts(base)],
    base,
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
            // Three.js only ever loads through a dynamic import (lazy 3D scenes).
            if (/node_modules\/(three|@react-three|react-reconciler|its-fine|zustand|suspend-react|react-use-measure)\//.test(id)) return 'three';
            return undefined;
          },
        },
      },
    },
    server: { port: 5173 },
  };
});
