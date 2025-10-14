<template>
  <section class="mage-ui">
    <header>
      <h3>{{ classeLabel || 'Mage' }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <section v-if="modules && modules.length">
      <h4>Traits & fonctionnalités</h4>
      <ul>
        <li v-for="m in modules" :key="m.id">
          <strong>{{ m.title }}</strong>
          <div style="margin-top:6px; font-size:13px; color:var(--texte-2)">
            <pre>{{ m.description }}</pre>
          </div>
          <div v-if="m.usage || m.cooldown" style="font-size:12px; color:var(--accent-2)">
            <span v-if="m.usage">Usage: {{ m.usage }}</span>
            <span v-if="m.cooldown">Cooldown: {{ m.cooldown }}</span>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="!modules || !modules.length">
      <p style="color:var(--texte-2)">Aucune donnée de classe disponible pour ce personnage.</p>
    </section>
  </section>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ classeLabel?: string; modules?: any[] }>()

const subtitle = computed(() => (props.modules && props.modules.length ? 'Pouvoirs et sorts disponibles' : ''))
</script>

<style scoped>
.mage-ui { padding: 12px; background: rgba(8,12,30,0.6); border-radius: 12px; border:1px solid var(--bord); color:var(--texte); }
.mage-ui header h3 { margin:0; font-size:18px; }
.mage-ui pre { margin:6px 0; background: rgba(0,0,0,0.25); padding:8px; border-radius:6px; color:var(--texte-2); font-size:12px; }
</style>

