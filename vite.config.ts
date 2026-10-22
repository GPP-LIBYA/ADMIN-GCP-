import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const deployTarget =
    process.env.VITE_DEPLOY_TARGET ||
    env.VITE_DEPLOY_TARGET ||
    '';

  let base = '/';
  if (deployTarget === 'production') {
    base = '/admin/';
  } else if (deployTarget === 'github-pages') {
    base = '/ADMIN-GCP-/';
  }

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
