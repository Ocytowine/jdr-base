// nuxt.config.ts
// Rôle : Configuration Nuxt. On active Pinia, Tailwind et on fixe des meta simples.
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      'autoprefixer': {}
    }
  },
  devtools: { enabled: true },
  nitro: {
    compatibilityDate: '2025-09-15',
  },
  app: {
    head: {
      title: 'JDR BASE',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Site JDR — Création PJ (Module_Bonome) et base UI' }
      ]
    }
  },

  // -------------------------
  // Runtime config (server-only + public)
  // -------------------------
  runtimeConfig: {
    // server-only values (ne sont **pas** exposés au client)
    github: {
      owner: process.env.GITHUB_OWNER || 'Ocytowine',
      repo: process.env.GITHUB_REPO || 'ArchiveValmorinTest',
      branch: process.env.GITHUB_BRANCH || 'main',
      token: process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN    // <- ton token si nécessaire (server-only)
    },
    dataCacheDir: process.env.DATA_CACHE_DIR || '/tmp/data_adapter_cache',

    // public values (exposées côté client via useRuntimeConfig().public)
    public: {
      // place ici ce que tu veux exposer au client (vide pour l'instant)
    }
  }
});
