import tailwindcss from '@tailwindcss/vite'

const sha = process.env.GITHUB_SHA?.slice(0, 7)

export default defineNuxtConfig({

  modules: ['@vite-pwa/nuxt', '@nuxt/eslint', 'reka-ui/nuxt', '@nuxt/icon', '@vueuse/nuxt'],
  ssr: false,
  pages: true,
  devtools: { enabled: false },

  app: {
    head: {
      title: 'Verticale Paniek',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0f172a' },
        { name: 'color-scheme', content: 'dark light' },
        { name: 'description', content: 'Hub for the Verticale Paniek climbing group' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  css: ['~/assets/main.css'],

  // GitHub Pages cannot rewrite deep links, so routes live after the `#`.
  // Site is served at the origin root (verticalepaniek.be), so baseURL stays `/`.
  router: { options: { hashMode: true } },

  runtimeConfig: {
    public: {
      buildVersion: sha ?? 'dev',
      buildTime: new Date().toISOString(),
      // Public by design: access is enforced by RLS and disabled signups, not by hiding these.
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    },
  },

  // Source maps stay on in production: we debug the deployed build from phone devtools.
  sourcemap: { client: true, server: false }, compatibilityDate: '2026-10-01',
  vite: { plugins: [tailwindcss()] },
  eslint: { config: { stylistic: true } },
  icon: { provider: 'none', clientBundle: { scan: true } },

  pwa: {
    // 'prompt': a new service worker waits until the user taps "Update" (see UpdatePrompt.vue).
    registerType: 'prompt',
    // Re-check for a new deploy every hour while the app stays open.
    client: { periodicSyncForUpdates: 3600 },
    manifest: {
      name: 'Verticale Paniek',
      short_name: 'Paniek',
      description: 'Hub for the Verticale Paniek climbing group',
      lang: 'nl',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
    },
    devOptions: { enabled: false },
  },
})
