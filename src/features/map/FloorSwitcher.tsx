import { useTranslation } from 'react-i18next';
import type { FloorId } from '../../domain/types';

interface Props {
  /** 地図に出てくる階（下から） */
  floors: FloorId[];
  current: FloorId;
  onChange: (floor: FloorId) => void;
}

/** 表示する階を選ぶボタン（上の階ほど上に並べる） */
export function FloorSwitcher({ floors, current, onChange }: Props) {
  const { t } = useTranslation();
  if (floors.length < 2) return null;
  return (
    <div className="floor-switcher" role="group" aria-label={t('map.floors')}>
      {[...floors].reverse().map((floor) => (
        <button
          key={floor}
          type="button"
          aria-pressed={floor === current}
          aria-label={t('map.showFloor', { floor })}
          onClick={() => onChange(floor)}
        >
          {floor}
        </button>
      ))}
    </div>
  );
}
