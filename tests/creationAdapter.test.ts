import assert from 'node:assert/strict';

import { CreationAdapterServer } from '../utils/creationAdapterServer';

class StubAdapter {
  spells: any[];

  constructor() {
    this.spells = [
      {
        id: 'spell_magic_missile',
        name: 'Projectiles magiques',
        level: 1,
        school: 'evocation',
        tags: ['wizard', 'force']
      },
      {
        id: 'spell_burning_hands',
        name: 'Mains brûlantes',
        level: 2,
        school: 'evocation',
        tags: ['wizard', 'fire']
      }
    ];
  }

  async resolveFeatureTree() {
    return [
      {
        originId: 'race_human',
        payload: {
          id: 'race_human',
          effects: [
            {
              type: 'choice',
              payload: {
                category: 'skill',
                ui_id: 'humain_bonus_competence',
                choose: 1,
                from: ['survie']
              }
            }
          ]
        }
      },
      {
        originId: 'class_wizard',
        payload: {
          id: 'class_wizard_spell_choice',
          effects: [
            {
              type: 'choice',
              payload: {
                category: 'spell',
                ui_id: 'wizard_level1_spell',
                choose: 1,
                auto_from: {
                  collection: 'spells',
                  filters: {
                    level: 1,
                    tags: ['wizard']
                  }
                }
              }
            }
          ]
        }
      }
    ];
  }

  async queryCollection(collection: string, predicate: (entry: any) => boolean | Promise<boolean>) {
    if (collection !== 'spells') return [];
    const results: any[] = [];
    for (const spell of this.spells) {
      if (await predicate(spell)) {
        results.push(spell);
      }
    }
    return results;
  }
}

export async function run() {
  const adapter = new StubAdapter();
  const creation = new CreationAdapterServer(adapter as any);

  const result = await creation.buildPreview(
    {
      chosenOptions: {
        humain_bonus_competence: ['survie']
      }
    },
    {}
  );

  assert.equal(result.ok, true, 'preview should be ok');
  assert.ok(
    result.previewCharacter.proficiencies.includes('survie'),
    'selected skill proficiency should be granted'
  );
  assert.equal(result.pendingChoices.length, 1, 'should only have the spell choice pending');
  const [spellChoice] = result.pendingChoices;
  assert.equal(spellChoice.ui_id, 'wizard_level1_spell', 'spell choice should be identified');
  assert.deepEqual(
    spellChoice.from,
    ['spell_magic_missile'],
    'auto_from should filter only matching spell ids'
  );
  assert.deepEqual(
    spellChoice.from_labels,
    [
      {
        id: 'spell_magic_missile',
        label: 'Projectiles magiques',
        description: null,
        effectLabel: null,
        effect_label: null,
        image: null
      }
    ],
    'auto_from should provide labels for filtered spells'
  );

  const resultWithSpell = await creation.buildPreview(
    {
      chosenOptions: {
        humain_bonus_competence: ['survie'],
        wizard_level1_spell: ['spell_magic_missile']
      }
    },
    {}
  );

  assert.equal(resultWithSpell.ok, true, 'preview with spell selection should be ok');
  assert.equal(
    resultWithSpell.pendingChoices.length,
    0,
    'all choices should be satisfied when spell is preselected'
  );
  assert.ok(
    resultWithSpell.previewCharacter.spellcasting?.known?.includes('spell_magic_missile'),
    'selected spell should be granted to known spells'
  );
}
