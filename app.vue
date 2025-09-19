<template>
  <div class="app">
    <header class="entete">
      <nav class="nav">
        <NuxtLink to="/" class="brand">JDR BASE</NuxtLink>
        <div class="liens">
          <NuxtLink to="/joueur">Joueur</NuxtLink>
          <NuxtLink to="/creation">Création PJ</NuxtLink>
          <NuxtLink to="/aventure">Aventure</NuxtLink>ss
        </div>
      </nav>
    </header>

    <main class="contenu">
      <NuxtPage />
    </main>

    <footer class="pied">
      <small>© {{ new Date().getFullYear() }} JDR BASE — Maquette locale</small>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Layout global
</script>

<style>
:root{
  --fond: #0f1226;
  --carte: #171a34;
  --carte-2: #1f2346;
  --bord: #2e335f;
  --accent: #7aa2ff;
  --accent-2: #c1d4ff;
  --texte: #e6e9ff;
  --texte-2: #b8bce6;
  --ok: #59d38c;
  --ko: #ff6b6b;
}
*{ box-sizing: border-box; }
html,body,#__nuxt,.app{ height:100%; }
body{ margin:0; background: radial-gradient(1200px 800px at 20% 0%, #14173a, var(--fond)); color: var(--texte); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }

.entete{ position: sticky; top:0; backdrop-filter: blur(6px); background: #0f1226aa; border-bottom:1px solid var(--bord); z-index:10; }
.nav{ max-width: 1100px; margin: 0 auto; display:flex; align-items:center; justify-content: space-between; padding: 12px 16px; }
.nav a{ color: var(--accent-2); text-decoration: none; margin-left: 14px; }
.brand{ font-weight: 800; letter-spacing: .5px; color: var(--accent); }

.contenu{ max-width: 1100px; margin: 24px auto; padding: 0 16px; }

.carte{ background: linear-gradient(180deg, var(--carte), var(--carte-2)); border: 1px solid var(--bord); border-radius: 14px; padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
.h1{ font-size: 26px; margin: 0 0 10px; }
.h2{ font-size: 20px; margin: 0 0 8px; color: var(--accent-2); }
.ligne{ display:flex; gap:12px; align-items:center; }
.champs{ display:grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
.badge{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--bord); background: #101435; border-radius: 999px; padding: 6px 10px; font-size: 12px; color: var(--accent-2); }
.btn{ cursor:pointer; background: var(--accent); color:#08122b; border:none; border-radius: 10px; padding: 10px 14px; font-weight: 700; }
.btn.ghost{ background: transparent; color: var(--accent); border:1px solid var(--accent); }
.input, select{ width:100%; padding:10px 12px; border-radius:10px; background:#0f1330; border:1px solid var(--bord); color:var(--texte); }
.table{ width:100%; border-collapse: collapse; }
.table th, .table td{ border-bottom:1px solid var(--bord); padding:8px 6px; text-align:left; }

.pied{ border-top:1px solid var(--bord); padding: 16px; text-align:center; color: var(--texte-2); }
</style>
