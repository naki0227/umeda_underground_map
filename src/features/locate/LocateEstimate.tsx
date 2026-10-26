import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Graph } from '../../domain/graph';
import type { LocationCandidate } from '../../domain/locate';
import { nodeFloor, type NodeId } from '../../domain/types';
import { localized } from '../../i18n';

interface Props {
  graph: Graph;
  candidates: LocationCandidate[];
  onConfirm: (nodeId: NodeId) => void;
}

/** 推定した位置（いちばん確かな 1 つを大きく）と、ほかの候補 */
export function LocateEstimate({ graph, candidates, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  // 推定結果カードは画面外に出やすいので、表示されたら見える位置へ寄せる
  useEffect(() => {
    if (candidates.length === 0) return;
    // 「視差効果を減らす」設定ならアニメーションせずに移る
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cardRef.current?.scrollIntoView?.({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [candidates]);

  const nodeName = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? localized(node.name, i18n.language) : nodeId;
  };
  const floorOf = (nodeId: NodeId) => {
    const node = graph.nodes.get(nodeId);
    return node ? nodeFloor(node) : 'B1';
  };
  const percent = (c: LocationCandidate) =>
    t('locate.candidateConfidence', { percent: Math.round(c.confidence * 100) });

  if (candidates.length === 0) return <p className="hint warn">{t('locate.noCandidates')}</p>;
  const [top, ...others] = candidates;
  return (
    <>
      <div className="estimate-card" ref={cardRef}>
        <p className="estimate-title">{t('locate.estimatedTitle')}</p>
        <p className="estimate-place">
          {t('locate.estimatedNear', { name: nodeName(top.nodeId) })}
        </p>
        <p className="estimate-meta">
          <span className="floor-badge">{floorOf(top.nodeId)}</span>
          <span className="confidence">{percent(top)}</span>
        </p>
        <button type="button" className="primary" onClick={() => onConfirm(top.nodeId)}>
          {t('locate.startHere')}
        </button>
        <p className="hint">{t('locate.fixedNote')}</p>
      </div>
      {others.length > 0 && (
        <div className="candidates">
          <h3>{t('locate.candidatesTitle')}</h3>
          <ul className="choice-list">
            {others.map((c) => (
              <li key={c.nodeId}>
                <button type="button" className="candidate" onClick={() => onConfirm(c.nodeId)}>
                  <span>{nodeName(c.nodeId)}</span>
                  <span className="confidence">{percent(c)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
