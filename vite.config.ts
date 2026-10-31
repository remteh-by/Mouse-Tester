import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), ...(mode === 'site' ? [{
      name: 'static-site-policy',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: {'http-equiv':'Content-Security-Policy', content:"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'"},
        injectTo: 'head-prepend' as const,
      }],
    }] : [])],
    base: mode === 'site' ? '/Mouse-Tester/' : '/',
    // Shadow-root styles must remain same-origin files under the strict CSP.
    build: {outDir:mode === 'site' ? "dist/site" : "dist/client",sourcemap:false,assetsInlineLimit:0},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
