import type { DefineComponent } from 'vue';

import type { PrimarySelectionGroup } from '@/stores/bonomeCreation';

export type BonomePhaseId =
  | 'identity'
  | 'race'
  | 'class'
  | 'background'
  | 'level'
  | 'choices'
  | 'equipment'
  | 'description'
  | 'recap';

export type BonomePhaseMeta = {
  id: BonomePhaseId;
  title: string;
  shortTitle: string;
  description?: string;
  onValidate?: () => Promise<void> | void;
  onReset?: () => Promise<void> | void;
};

export type BonomePhaseComponentConfig = {
  id: BonomePhaseId;
  component: DefineComponent;
};

export type BonomePhaseProps = {
  stepMeta: BonomePhaseMeta;
  raceGroup?: PrimarySelectionGroup | null;
  classGroup?: PrimarySelectionGroup | null;
  backgroundGroup?: PrimarySelectionGroup | null;
  preview?: any | null;
};
