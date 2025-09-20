/**
 * Basic test skeleton for CreationAdapterServer
 * Use your test runner (jest/vitest) to run this file.
 * This test only runs locally if you mock DataAdapterV2GitHub methods.
 */

import { CreationAdapterServer } from '../utils/creationAdapterServer';
import { EffectEngine } from '../engine/effectEngine';

class MockAdapter {
  async resolveFeatureTree(seedIds:any[]) {
    // Return one simple feature that gives +2 dexterity
    return [{
      id: 'mock_race',
      effects: [{ id: 'm1', type: 'stat_modifier', source: 'mock_race', payload: { stat: 'dexterity', delta: 2 } }]
    }];
  }
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