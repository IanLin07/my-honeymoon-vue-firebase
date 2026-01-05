import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),

    VitePWA({
      // 讓它自動把註冊碼注入到 index.html（你不用手動寫 registerSW）
      injectRegister: 'auto',
      // 有新版本時自動更新 SW（使用者下次開啟就吃到新版本）
      registerType: 'autoUpdate',

      // 你是 GitHub Pages 子路徑部署：一定要對齊 scope / start_url
      manifest: {
        name: '廷翰與燁姍的蜜月旅行',
        short_name: '蜜月',
        description: '蜜月行程與記帳 App',
        display: 'standalone',
        background_color: '#f7f4ee',
        theme_color: '#4fb6ff',
        scope: '/my-honeymoon-vue-firebase/',
        start_url: '/my-honeymoon-vue-firebase/',
        icons: [
          {
            src: '/my-honeymoon-vue-firebase/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/my-honeymoon-vue-firebase/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/my-honeymoon-vue-firebase/pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // 把 public 裡指定資產也納入快取（含 iOS 的 apple-touch-icon）
      includeAssets: [
        'pwa/apple-touch-icon.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/icon-512-maskable.png',
      ],

      // 想在本機也測 SW（可選，但我建議先開，測完再關）
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  base: '/my-honeymoon-vue-firebase/',
})
