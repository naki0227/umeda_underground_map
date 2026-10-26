import { useTranslation } from 'react-i18next';
import type { AboveGroundSuggestion, RoutePlan } from './useRoutePlan';

interface Props {
  /** 経路が見つからなければ null */
  result: RoutePlan | null;
  stepCount: number;
  aboveGroundSuggestion: AboveGroundSuggestion;
  rain: boolean;
  lateNight: boolean;
}

/**
 * 道案内のお知らせ。大事なものを 1 つだけ出す（並べると読まれない）。
 * 見つからない → 閉まった所を通る → 段差 → もう着いている → 地上の方がずっと近い → 深夜 → 雨
 */
export function RouteNotice({ result, stepCount, aboveGroundSuggestion, rain, lateNight }: Props) {
  const { t } = useTranslation();
  const notice: { kind: string; text: string; id: string; link?: string } | null = (() => {
    if (result === null) return { kind: 'warn', text: t('route.notFound'), id: 'not-found' };
    if (result.throughClosed)
      return { kind: 'warn', text: t('route.throughClosed'), id: 'closed-warning' };
    if (result.needsSteps)
      return { kind: 'warn', text: t('route.needsSteps'), id: 'step-free-warning' };
    if (result.usesStairs)
      return { kind: 'warn', text: t('route.usesStairs'), id: 'stairs-warning' };
    if (stepCount === 0) return { kind: 'ok', text: t('route.alreadyHere'), id: 'already-here' };
    if (aboveGroundSuggestion !== null && !rain)
      return {
        kind: 'info',
        id: 'above-ground-suggest',
        text: t('route.aboveGroundSuggest', {
          underground: aboveGroundSuggestion.undergroundM,
          straight: aboveGroundSuggestion.straightM,
        }),
        link: aboveGroundSuggestion.url,
      };
    if (lateNight) return { kind: 'info', text: t('route.lateNight'), id: 'late-night-note' };
    if (rain) return { kind: 'info', text: t('route.rainNote'), id: 'rain-note' };
    return null;
  })();
  if (notice === null) return null;
  return (
    <p className={`hint ${notice.kind}`} data-testid={notice.id}>
      {notice.text}
      {notice.link !== undefined && (
        <>
          {' '}
          <a href={notice.link} target="_blank" rel="noopener noreferrer">
            {t('route.openGoogleMaps')}
          </a>
        </>
      )}
    </p>
  );
}
