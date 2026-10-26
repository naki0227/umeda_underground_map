import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { NodeId, Poi, Shop } from '../../domain/types';
import { ExitCodeLocate } from './ExitCodeLocate';
import { LandmarkLocate } from './LandmarkLocate';
import { ShopLocate } from './ShopLocate';

interface Props {
  graph: Graph;
  shops: Shop[];
  pois: Poi[];
  /** 「迷った」から開いたとき true。再測位の説明を出す */
  lost?: boolean;
  /** 起動時に取れた GPS 位置。あれば位置推定のヒントに使う */
  initialGps?: { lat: number; lng: number } | null;
  onConfirm: (nodeId: NodeId) => void;
}

type Method = 'exit' | 'landmark' | 'shop';
const METHODS: { value: Method; key: string }[] = [
  { value: 'exit', key: 'locate.byExit' },
  { value: 'landmark', key: 'locate.byLandmark' },
  { value: 'shop', key: 'locate.byShop' },
];

/**
 * 現在地をえらぶ。方法（出口の番号・目印・見えるお店）を 1 つ選び、その方法の入力だけを出す。
 * 出口の番号は地下のどこにでも黄色い案内板があり、いちばん確かなので最初に開いておく
 */
export function LocateScreen({
  graph,
  shops,
  pois,
  lost = false,
  initialGps = null,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [method, setMethod] = useState<Method>('exit');

  return (
    <section className="locate-screen">
      {lost && <p className="hint warn">{t('lost.description')}</p>}
      <fieldset className="segmented locate-methods">
        <legend className="visually-hidden">{t('locate.methodLabel')}</legend>
        {METHODS.map(({ value, key }) => (
          <label key={value} className={method === value ? 'active' : undefined}>
            <input
              type="radio"
              name="locate-method"
              checked={method === value}
              onChange={() => setMethod(value)}
            />
            {t(key)}
          </label>
        ))}
      </fieldset>
      {method === 'exit' && <ExitCodeLocate graph={graph} onConfirm={onConfirm} />}
      {method === 'landmark' && <LandmarkLocate graph={graph} onConfirm={onConfirm} />}
      {method === 'shop' && (
        <ShopLocate
          graph={graph}
          shops={shops}
          pois={pois}
          initialGps={initialGps}
          onConfirm={onConfirm}
        />
      )}
    </section>
  );
}
