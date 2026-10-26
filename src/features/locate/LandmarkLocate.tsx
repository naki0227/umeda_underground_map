import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { NodeId } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  onConfirm: (nodeId: NodeId) => void;
}

/** よく使う目印: 広場（ランドマーク）を先頭に、続けて改札。押すとそこから案内を始める */
export function LandmarkLocate({ graph, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const picks = useMemo(() => {
    const nodes = [...graph.nodes.values()];
    return [
      ...nodes.filter((n) => n.kind === 'landmark'),
      ...nodes.filter((n) => n.kind === 'gate'),
    ];
  }, [graph]);

  return (
    <div className="locate-panel">
      <p className="description">{t('locate.landmarkHelp')}</p>
      <div className="quick-chips">
        {picks.map((node) => (
          <button key={node.id} type="button" className="chip" onClick={() => onConfirm(node.id)}>
            {localized(node.name, i18n.language)}
          </button>
        ))}
      </div>
    </div>
  );
}
