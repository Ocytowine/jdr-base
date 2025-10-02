<template>
  <div class="app">
    <header class="entete">
      <nav class="nav">
        <NuxtLink to="/" class="brand">JDR BASE</NuxtLink>
        <div class="liens">
          <NuxtLink to="/joueur">Joueur</NuxtLink>
          <NuxtLink to="/creation">Création PJ</NuxtLink>
          <NuxtLink to="/aventure">Aventure</NuxtLink>
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
  --warn: #f6c760;
  --surface-overlay: rgba(23, 26, 52, 0.78);
  --accent-soft: rgba(122, 162, 255, 0.16);
  --accent-border-soft: rgba(122, 162, 255, 0.35);
  --ok-soft: rgba(89, 211, 140, 0.18);
  --ok-soft-border: rgba(89, 211, 140, 0.45);
  --warn-soft: rgba(246, 199, 96, 0.18);
  --warn-soft-border: rgba(246, 199, 96, 0.4);
  --ko-soft: rgba(255, 107, 107, 0.2);
  --ko-soft-border: rgba(255, 107, 107, 0.45);
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
.badge{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--bord); background:#101435; border-radius:999px; padding:6px 10px; font-size:12px; color:var(--accent-2); }
.badge--accent{ background: var(--accent-soft); border-color: var(--accent-border-soft); color: var(--accent-2); }


.btn{ cursor:pointer; background: var(--accent); color:#08122b; border:none; border-radius: 10px; padding: 10px 14px; font-weight: 700; }
.btn.ghost{ background: transparent; color: var(--accent); border:1px solid var(--accent); }
.input, select{ width:100%; padding:10px 12px; border-radius:10px; background:#0f1330; border:1px solid var(--bord); color:var(--texte); }
.table th, .table td{ border-bottom:1px solid var(--bord); padding:8px 6px; text-align:left; }

.phase {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.phase__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.phase__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--texte);
}

.phase__subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--texte-2);
}

.phase__form {
  display: grid;
  gap: 20px;
}

@media (min-width: 768px) {
  .phase__form {
    grid-template-columns: minmax(0, 1fr) 280px;
  }
}

.phase__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.phase .field__label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--texte);
  margin-bottom: 6px;
}

.phase .field__input {
  margin: 0;
  background: var(--carte-2);
  border-color: var(--bord);
  color: var(--texte);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.phase .field__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(122, 162, 255, 0.2);
}

.phase .field__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--texte-2);
}

.phase__preview {
  border-radius: 14px;
  border: 1px dashed var(--bord);
  background: linear-gradient(180deg, var(--carte), var(--carte-2));
  padding: 18px;
  color: var(--texte);
}

.phase__preview-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
}

.phase__preview-list {
  margin: 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.phase__preview-key {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--texte-2);
  margin: 0 0 4px;
}

.phase__preview-value {
  margin: 0;
  font-size: 14px;
  color: var(--texte);
}

.phase__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  justify-items: center;
}

.phase__message {
  border-radius: 14px;
  border: 1px dashed var(--bord);
  background: linear-gradient(180deg, rgba(23, 26, 52, 0.65), rgba(15, 18, 38, 0.88));
  padding: 18px;
  font-size: 14px;
  color: var(--texte-2);
  line-height: 1.45;
}

.phase__message--info {
  border-color: var(--accent-border-soft);
  background: rgba(18, 25, 56, 0.72);
}

.phase__message--warn {
  border-color: var(--warn-soft-border);
  background: var(--warn-soft);
  color: var(--warn);
}

.phase__message--error {
  border-color: var(--ko-soft-border);
  background: var(--ko-soft);
  color: var(--ko);
}

.phase__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.phase__action {
  cursor: pointer;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.2s ease;
}

.phase__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.phase__action--ghost {
  background: transparent;
  border-color: var(--bord);
  color: var(--texte-2);
}

.phase__action--ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.phase__action--primary {
  background: var(--accent);
  color: #08122b;
  box-shadow: 0 12px 32px rgba(122, 162, 255, 0.25);
}

.phase__action--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 36px rgba(122, 162, 255, 0.35);
}

.pied{ border-top:1px solid var(--bord); padding: 16px; text-align:center; color: var(--texte-2); }
</style>


