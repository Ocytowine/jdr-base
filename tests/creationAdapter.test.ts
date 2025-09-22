import assert from 'node:assert/strict';

import { CreationAdapterServer } from '../utils/creationAdapterServer';

class StubAdapter {
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
      }
    ];
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
  assert.equal(
    result.pendingChoices.length,
    0,
    'choice should not remain pending when effect generated'
  );
}
