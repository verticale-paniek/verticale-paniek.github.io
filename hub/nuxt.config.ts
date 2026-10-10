const sha = process.env.GITHUB_SHA?.slice(0, 7)

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  pages: true,
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt', '@nuxt/eslint'],
  css: ['~/assets/main.css'],

  // GitHub Pages cannot rewrite deep links, so routes live after the `#`.
  // Site is served at the origin root (verticale-paniek.github.io), so baseURL stays `/`.
  router: { options: { hashMode: true } },

  // Source maps stay on in production: we debug the deployed build from phone devtools.
  sourcemap: { client: true, server: false },

  runtimeConfig: {
    public: {
      buildVersion: sha ?? 'dev',
      buildTime: new Date().toISOString(),
    },
  },

  app: {
    head: {
      title: 'Verticale Paniek',
      meta: [
        { name: 'theme-color', content: '#222021' },
        { name: 'description', content: 'Hub for the Verticale Paniek climbing group' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

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
      theme_color: '#222021',
      background_color: '#222021',
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
