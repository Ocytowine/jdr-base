<template>
  <article
    :class="cardClass"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- Image -->
      <img
        :src="props.image || '/images/card.jpg'"
        :alt="props.imageAlt"
        class="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />

    <!-- Body -->
    <div class="p-6 flex-1 overflow-hidden">
      <h3 class="text-2xl font-extrabold leading-tight">
          {{ props.title }}
      </h3>

      <p class="mt-3 text-slate-300 line-clamp-6">
        {{ props.description }}
      </p>
    </div>

    <!-- Footer (badge + fixed-size button) -->
    <footer class="px-6 py-4 border-t border-slate-800 relative bg-gradient-to-t from-transparent to-transparent">
      <div class="flex items-center justify-between gap-4">
        <div class="text-sm text-slate-400">
          <slot name="meta"></slot>
        </div>

        <!-- right group: badge (flex-1) + fixed button -->
        <div class="flex items-center gap-3 min-w-0">
          <!-- badge container: take remaining space, allow wrap, won't push button -->
          <div class="flex-1 min-w-0">
            <span
              v-if="props.effactLabel"
              :class="badgeClass"
              role="status"
              :aria-label="`Label: ${props.effactLabel}`"
              class="inline-block w-full break-words whitespace-normal"
            >
              {{ props.effactLabel }}
            </span>
          </div>

          <!-- Action button (FIXED size) -->
          <div class="relative" ref="btnWrapper">
            <button
              @click="toggleMenu"
              :aria-expanded="isOpen"
              class="w-36 h-10 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-sm bg-slate-700 text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors truncate"
            >
              <!-- label truncated if too long, button won’t change size -->
              <span class="truncate max-w-[10rem]">{{ buttonLabel }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.063a.75.75 0 011.1 1.02l-4.25 4.657a.75.75 0 01-1.1 0L5.25 8.27a.75.75 0 01-.02-1.06z" clip-rule="evenodd" />
              </svg>
            </button>

            <!-- Dropdown (position absolute; n'affecte pas la taille) -->
            <div
              v-if="isOpen"
              ref="menu"
              class="absolute right-0 bottom-full mb-3 w-44 bg-slate-800 text-slate-100 rounded-lg shadow-lg ring-1 ring-slate-700 overflow-hidden z-40"
            >
              <ul class="py-2">
                <li>
                  <button
                    @click="choose('write')"
                    class="w-full text-left px-4 py-2 hover:bg-slate-700"
                  >
                    Écrire dans le grimoire
                  </button>
                </li>
                <li>
                  <button
                    @click="choose('write-prepare')"
                    class="w-full text-left px-4 py-2 hover:bg-slate-700"
                  >
                    Écrire et préparer
                  </button>
                </li>
                <li>
                  <button
                    @click="resetSelection"
                    class="w-full text-left px-4 py-2 hover:bg-slate-700 text-amber-300"
                  >
                    Annuler la sélection
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* emits */
const emit = defineEmits(['write', 'write-prepare', 'reset'])

/* props */
const props = withDefaults(defineProps<{
  title: string
  description?: string
  image?: string
  imageAlt?: string
  href?: string
  effactLabel?: string
  effactVariant?: 'primary' | 'light' | 'outline'
}>(), {
  description: '',
  imageAlt: 'Card image',
  href: '#',
  effactVariant: 'primary'
})

/* state */
const isOpen = ref(false)
const selected = ref<'none' | 'write' | 'write-prepare'>('none')
const btnWrapper = ref<HTMLElement | null>(null)
const hovering = ref(false)

/* interactions */
function toggleMenu() {
  isOpen.value = !isOpen.value
}

function choose(action: 'write' | 'write-prepare') {
  selected.value = action === 'write' ? 'write' : 'write-prepare'
  isOpen.value = false
  if (action === 'write') emit('write', { title: props.title })
  else emit('write-prepare', { title: props.title })
}

function resetSelection() {
  selected.value = 'none'
  isOpen.value = false
  emit('reset', { title: props.title })
}

/* close on outside click */
function handleClickOutside(e: MouseEvent) {
  const t = e.target as Node
  if (!btnWrapper.value) return
  if (!btnWrapper.value.contains(t)) isOpen.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

/* badge classes */
const badgeClass = computed(() => {
  const base = 'inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full shadow-sm transition-all'
  const variants: Record<string, string> = {
    primary: 'bg-sky-500 text-white',
    light: 'bg-white/90 text-slate-900',
    outline: 'bg-transparent text-white ring-1 ring-white/20'
  }
  return `${base} ${variants[props.effactVariant || 'primary']}`
})

/* fixed button label (can change) */
const buttonLabel = computed(() => {
  if (selected.value === 'write') return 'Écrit ✔'
  if (selected.value === 'write-prepare') return 'Écrit & Préparé ✔'
  return 'Actions'
})

/* CARD classes:
   - taille figée (w + h)
   - hover animation toujours active
   - glow appliqué à la card (et n'affecte pas la taille du layout)
*/
const cardClass = computed(() => {
  const width = 'w-[360px]'      // fixe largeur
  const height = 'h-[460px]'     // fixe hauteur
  const base = `relative ${width} ${height} rounded-2xl overflow-hidden bg-white dark:bg-slate-900 group flex flex-col transform-gpu transition-transform duration-300`
  const hoverEffect = 'hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl'
  // border according to selection: none -> transparent, write-prepare -> blue, write -> green
  const borderClasses =
    selected.value === 'write-prepare' ? 'border-2 border-sky-500' :
    selected.value === 'write' ? 'border-2 border-emerald-400' :
    'border border-transparent'
  // optional glow/ring to emphasize selection (kept subtle)
  const glow =
    selected.value === 'write-prepare' ? 'ring-2 ring-sky-400/30 shadow-[0_12px_40px_rgba(59,130,246,0.08)]' :
    selected.value === 'write' ? 'ring-2 ring-emerald-400/20 shadow-[0_10px_30px_rgba(52,211,153,0.06)]' :
    ''
  return `${base} ${hoverEffect} ${borderClasses} ${glow}`
})
</script>
