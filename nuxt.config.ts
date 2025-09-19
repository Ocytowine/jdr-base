// Fichier : nuxt.config.ts
// Rôle : Configuration Nuxt. On active Pinia et on fixe des meta simples.
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
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
});
