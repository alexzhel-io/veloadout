import { GEAR_PRESETS, GearPreset } from '@/domain/gear/GearPreset';

export class GetPresetsUseCase {
  execute(): GearPreset[] {
    return GEAR_PRESETS;
  }
}
