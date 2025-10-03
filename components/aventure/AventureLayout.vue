<template>
  <div class="aventure-layout">
    <aside class="aventure-layout__sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="aventure-layout__main">
      <section class="aventure-layout__chat">
        <slot name="chat" />
      </section>
      <section class="aventure-layout__panel">
        <slot />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
// Pure layout component holding slots for sidebar, chat area and the active panel.
</script>

<style scoped>
.aventure-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  height: calc(100vh - 120px);
  padding: 16px 0 32px;
}

.aventure-layout__sidebar {
  background: rgba(12, 16, 38, 0.85);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 20px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.aventure-layout__main {
  display: grid;
  grid-template-columns: 2fr 1.1fr;
  gap: 24px;
  align-items: stretch;
}

.aventure-layout__chat,
.aventure-layout__panel {
  background: rgba(12, 16, 38, 0.9);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aventure-layout__chat {
  min-height: 540px;
}

.aventure-layout__panel {
  min-height: 540px;
}

@media (max-width: 1280px) {
  .aventure-layout {
    grid-template-columns: 220px 1fr;
  }

  .aventure-layout__main {
    grid-template-columns: 1fr;
  }

  .aventure-layout__panel {
    margin-top: 16px;
  }
}

@media (max-width: 960px) {
  .aventure-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .aventure-layout__sidebar {
    flex-direction: row;
    overflow-x: auto;
    gap: 12px;
  }

  .aventure-layout__main {
    grid-template-columns: 1fr;
  }
}
</style>
