import { useTranslation } from 'react-i18next';
import type { RouteStep } from '../../domain/directions';
import { stepIcon, walkingSteps } from './stepText';

interface Props {
  step: RouteStep;
  index: number;
  total: number;
  /** 「「HEP FIVE」に到着」などの文 */
  actionText: string;
  /** いまいるフロア */
  floor: string;
  /** 一人称の画面が次の動きを出しているときは、読み上げ用に見えなくする */
  hidden: boolean;
}

/** いまの手順を大きく 1 枚で出す（何 m 進んで、どこで何をするか・いまの階） */
export function NextStepCard({ step, index, total, actionText, floor, hidden }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={hidden ? 'next-step-card visually-hidden' : 'next-step-card'}
      data-testid="next-step"
      aria-live="polite"
    >
      <span className="step-counter">{t('route.stepCounter', { current: index + 1, total })}</span>
      <span className="next-icon" aria-hidden>
        {stepIcon(step)}
      </span>
      <div className="next-body">
        <span className="next-distance">
          {t('route.stepGo', { distance: step.distanceM })}
          {step.distanceM > 0 && ` · ${t('route.steps', { steps: walkingSteps(step.distanceM) })}`}
        </span>
        <span className="next-action">{actionText}</span>
      </div>
      <div className="next-floors">
        <span className="floor-badge">{t('route.floorNow', { floor })}</span>
        {step.action === 'floor-change' && step.floorChange !== undefined && (
          <span className="floor-badge to">
            {t('route.floorNext', { floor: step.floorChange.to })}
          </span>
        )}
      </div>
    </div>
  );
}
