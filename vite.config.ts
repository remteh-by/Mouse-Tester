import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {offlineBuild} from './scripts/offline-build';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), ...(mode === 'site' ? [offlineBuild(),{
      name: 'static-site-policy',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: {'http-equiv':'Content-Security-Policy', content:"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"},
        injectTo: 'head-prepend' as const,
      },{tag:'link',attrs:{rel:'manifest',href:'/Mouse-Tester/manifest.webmanifest'},injectTo:'head' as const},{tag:'meta',attrs:{name:'theme-color',content:'#10171b'},injectTo:'head' as const}],
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
