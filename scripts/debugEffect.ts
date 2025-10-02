import fetch from "node-fetch";
import EffectEngine from "../engine/effectEngine.ts";
import { normalizeEffect } from "../utils/normalizeEffect.ts";

const OWNER = "Ocytowine";
const REPO = "ArchiveValmorinTest";
const BRANCH = "main";
const BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as any;
}

async function resolveItemById(id: string) {
  try {
    return await fetchJson(`items/${id}.json`);
  } catch (err) {
    return null;
  }
}

async function main() {
  const cls = await fetchJson("classes/guerrier.json");
  const bg = await fetchJson("backgrounds/soldat.json");

  const effects = [
    ...((cls.effects ?? []) as any[]),
    ...((bg.effects ?? []) as any[])
  ].map((ef) => normalizeEffect(ef)).filter(Boolean);

  const engine = new EffectEngine({ resolveItemById });
  const character: any = {};
  for (const effect of effects) {
    await engine.applyEffect(character, effect as any, { source: effect?.source ?? null, selection: { class: "guerrier", background: "soldat" } });
  }

  console.log(JSON.stringify({
    equipment: character.equipment,
    item_proposals: character.item_proposals,
    proficiencies: character.proficiencies
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
