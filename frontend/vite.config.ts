import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8801,
    allowedHosts: ['sakuragames.syjx.space'],//按需修改
    proxy: {
      '/api': {
        target: 'http://localhost:8802',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8801,
    allowedHosts: ['sakuragames.syjx.space'],//按需修改
    proxy: {
      '/api': {
        target: 'http://localhost:8802',
        changeOrigin: true,
      },
    },
  },
})
