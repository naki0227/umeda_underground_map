import { useTranslation } from 'react-i18next';
import type { RouteStep } from '../../domain/directions';
import { stepIcon, walkingSteps } from './stepText';

interface Props {
  steps: RouteStep[];
  currentIndex: number;
  actionText: (step: RouteStep) => string;
  onSelect?: (index: number) => void;
}

/** すべての手順（ふだんは閉じておく）。押すとその手順に移る */
export function RouteStepList({ steps, currentIndex, actionText, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <details className="route-steps">
      <summary>{t('route.allSteps', { count: steps.length })}</summary>
      <ol className="steps">
        {steps.map((step, index) => (
          <li
            key={`${step.atNodeId}-${index}`}
            className={index === currentIndex ? 'current' : index < currentIndex ? 'done' : ''}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            <button type="button" className="step-row" onClick={() => onSelect?.(index)}>
              <span className="step-icon" aria-hidden>
                {stepIcon(step)}
              </span>
              <span className="step-body">
                {step.distanceM > 0 && (
                  <span className="step-distance">
                    {t('route.stepGo', { distance: step.distanceM })}
                    {` · ${t('route.steps', { steps: walkingSteps(step.distanceM) })}`}
                  </span>
                )}
                <span className="step-action">{actionText(step)}</span>
              </span>
              {step.action === 'floor-change' && step.floorChange !== undefined && (
                <span className="floor-move">
                  {step.floorChange.from}→{step.floorChange.to}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}
