import { useTranslation } from 'react-i18next';
import type { Access, RoutePlan } from './useRoutePlan';

interface Props {
  access: Access;
  onAccessChange: (access: Access) => void;
  simple: boolean;
  onSimpleChange: (simple: boolean) => void;
  alternative: RoutePlan['alternative'];
}

const ACCESS: Access[] = ['normal', 'noStairs', 'stepFree'];
const ACCESS_KEY: Record<Access, string> = {
  normal: 'route.accessNormal',
  noStairs: 'route.avoidStairs',
  stepFree: 'route.stepFree',
};

/**
 * 経路の設定（ふだんは閉じておく）。段差の扱い・道の選び方を「どれか 1 つ」で選ぶ
 */
export function RouteOptions({
  access,
  onAccessChange,
  simple,
  onSimpleChange,
  alternative,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="route-options" data-testid="route-options">
      <fieldset className="segmented">
        <legend>{t('route.accessTitle')}</legend>
        {ACCESS.map((value) => (
          <label key={value} className={access === value ? 'active' : undefined}>
            <input
              type="radio"
              name="route-access"
              checked={access === value}
              onChange={() => onAccessChange(value)}
            />
            {t(ACCESS_KEY[value])}
          </label>
        ))}
      </fieldset>

      <fieldset className="segmented">
        <legend>{t('route.wayTitle')}</legend>
        {[true, false].map((value) => (
          <label key={String(value)} className={simple === value ? 'active' : undefined}>
            <input
              type="radio"
              name="route-way"
              checked={simple === value}
              onChange={() => onSimpleChange(value)}
            />
            {value ? t('route.useSimple') : t('route.useShortest')}
          </label>
        ))}
      </fieldset>
      {alternative !== null && (
        <p className="hint" data-testid="route-choice">
          {t(simple ? 'route.simpleNote' : 'route.shortestNote', {
            turns: alternative.turnsDiff,
            extra: alternative.extraM,
          })}
        </p>
      )}
    </div>
  );
}
