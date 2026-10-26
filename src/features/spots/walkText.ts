import type { TFunction } from 'i18next';
import { WALK_SPEED_M_PER_MIN } from '../../app/config';

/** 「徒歩3分・約220m」 */
export const walkText = (t: TFunction, distanceM: number) =>
  t('spots.walk', {
    minutes: Math.max(1, Math.round(distanceM / WALK_SPEED_M_PER_MIN)),
    distance: Math.round(distanceM),
  });
