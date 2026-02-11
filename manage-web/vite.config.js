import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 后端 Node 服务默认跑在 3000 端口
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/goods': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/announcement': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/oss': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
