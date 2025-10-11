<template>
  <div class="aventure-layout">
    <aside class="aventure-layout__sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="aventure-layout__main">
      <section class="aventure-layout__chat">
        <slot name="chat" />
      </section>
      <transition name="aventure-fade">
        <section v-if="$slots.default" class="aventure-layout__overlay">
          <div class="aventure-layout__overlay-card">
            <slot />
          </div>
        </section>
      </transition>
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
  position: relative;
}

.aventure-layout__chat {
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

.aventure-layout__overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
}

.aventure-layout__overlay-card {
  background: rgba(12, 16, 38, 0.96);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 24px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aventure-fade-enter-active,
.aventure-fade-leave-active {
  transition: opacity 0.15s ease;
}
.aventure-fade-enter-from,
.aventure-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1280px) {
  .aventure-layout {
    grid-template-columns: 220px 1fr;
  }

  .aventure-layout__main {
    /* single column layout */
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
    /* single column layout */
  }
}
</style>
