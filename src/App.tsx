import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ReportLink } from './components/ReportLink';
import { umedaMap } from './data/map';
import { buildGraph } from './domain/graph';
import { DestinationScreen } from './features/destination/DestinationScreen';
import { LocateScreen } from './features/locate/LocateScreen';
import { useNavigationState } from './features/navigation/useNavigationState';
import { RouteScreen } from './features/route/RouteScreen';

export default function App() {
  const { t } = useTranslation();
  const graph = useMemo(() => buildGraph(umedaMap), []);
  const nav = useNavigationState();

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <main>
        {nav.phase === 'locate' && (
          <LocateScreen
            graph={graph}
            shops={umedaMap.shops}
            pois={umedaMap.pois}
            onConfirm={nav.confirmLocation}
          />
        )}
        {nav.phase === 'destination' && (
          <DestinationScreen
            graph={graph}
            shops={umedaMap.shops}
            pois={umedaMap.pois}
            currentNodeId={nav.currentNodeId}
            onChoose={nav.chooseDestination}
          />
        )}
        {nav.phase === 'route' && nav.currentNodeId !== null && nav.destinationNodeId !== null && (
          <RouteScreen
            graph={graph}
            fromNodeId={nav.currentNodeId}
            toNodeId={nav.destinationNodeId}
            destinationLabel={nav.destinationLabel}
            onLost={nav.markLost}
            onNewSearch={nav.newSearch}
          />
        )}
      </main>

      <footer className="app-footer">
        <ReportLink />
        <p className="hint">{t('app.dataVersionNote', { version: umedaMap.dataVersion })}</p>
      </footer>
    </div>
  );
}
