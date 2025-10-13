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
        <section
          v-if="$slots.default"
          class="aventure-layout__overlay"
          :class="{ 'aventure-layout__overlay--transparent': overlayTransparent }"
        >
          <div
            class="aventure-layout__overlay-card"
            :class="{ 'aventure-layout__overlay-card--transparent': overlayTransparent }"
          >
            <slot />
          </div>
        </section>
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
// Pure layout component holding slots for sidebar, chat area and the active panel.
const props = defineProps<{ overlayTransparent?: boolean }>()
const overlayTransparent = !!(props.overlayTransparent)
</script>

<style scoped>
.aventure-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  height: calc(100vh - 120px);
  padding: 16px 0 32px;
  /* Allow children to size/scroll properly in grid */
  min-height: 0;
}

.aventure-layout__sidebar {
  background: rgba(12, 16, 38, 0.85);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 20px 16px;
  /* show all tabs: enable vertical scroll if content exceeds height */
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  /* for proper scrolling behavior inside grid */
  min-height: 0;
}

.aventure-layout__main {
  position: relative;
  min-height: 0;
}

.aventure-layout__chat {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aventure-layout__chat { min-height: 540px; }

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

.aventure-layout__overlay--transparent .aventure-layout__overlay-card,
.aventure-layout__overlay-card--transparent {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
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
    /* on mobile: horizontal scroll for tabs row */
    overflow-x: auto;
    overflow-y: visible;
    gap: 12px;
  }

  .aventure-layout__main {
    /* single column layout */
  }
}
</style>
