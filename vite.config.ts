import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '127.0.0.1',
      strictPort: true,
      allowedHosts: true,
      proxy: {
        '/api/sync': {
          target: 'https://jsonblob.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sync/, '/api/jsonBlob')
        },
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nvidia/, '')
        },
        '/api/cloudflare': {
          target: 'https://api.cloudflare.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cloudflare/, '')
        }
      }
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
