/**
 * Basic test skeleton for CreationAdapterServer
 * Use your test runner (jest/vitest) to run this file.
 * This test only runs locally if you mock DataAdapterV2GitHub methods.
 */

import { CreationAdapterServer } from '../utils/creationAdapterServer';
import { EffectEngine } from '../engine/effectEngine';

class MockAdapter {
// --- hotfix : utils/creationAdapterServer.ts ---
async resolveFeatureTree(selection: Selection) {
  // try adapter first, but be tolerant to errors
  if (this.adapter && typeof this.adapter.resolveFeatureTree === 'function') {
    try {
      const res = await this.adapter.resolveFeatureTree(selection);
      // defensive: ensure res is array
      if (Array.isArray(res)) return res;
      // if adapter returned single object, normalize to array
      if (res && typeof res === 'object') return [res];
      // otherwise fall back to local resolution
      console.warn('[CreationAdapterServer] adapter.resolveFeatureTree returned unexpected value, fallback to local', { res });
    } catch (err) {
      // log full error + selection for debugging, then fallback
      console.error('[CreationAdapterServer] adapter.resolveFeatureTree failed — fallback to local resolution', err, { selection });
    }
  }

  // fallback local resolution (existing logic)
  const out: any[] = [];
  if (selection.class) {
    const cls = await this.readLocalEntity('classes', String(selection.class));
    if (cls) out.push({ originId: selection.class, payload: cls });
  }
  if (selection.race) {
    const rc = await this.readLocalEntity('races', String(selection.race));
    if (rc) out.push({ originId: selection.race, payload: rc });
  }
  return out;
}


test('applyFeaturesToCharacter applies stat modifier', async () => {
  const adapter = new MockAdapter();
  const engine = new EffectEngine();
  const creation = new CreationAdapterServer(adapter as any, engine);
  const selection = { race: 'mock_race' };
  const base = { base_stats_before_race: { dexterity: 10 } };
  const res = await creation.applyFeaturesToCharacter(selection, base);
  if (!res.ok) throw new Error('Expected ok');
  if (res.previewCharacter.final_stats.dexterity !== 12) throw new Error('Expected dex 12');
});