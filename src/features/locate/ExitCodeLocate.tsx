import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchExitCode } from '../../domain/exitCode';
import type { Graph } from '../../domain/graph';
import { nodeFloor, type NodeId } from '../../domain/types';

interface Props {
  graph: Graph;
  onConfirm: (nodeId: NodeId) => void;
}

/** 目の前の案内板の出口番号（黄色い看板の「M-12」など）。選ぶとその出口のそばから案内を始める */
export function ExitCodeLocate({ graph, onConfirm }: Props) {
  const { t } = useTranslation();
  const [exitCode, setExitCode] = useState('');
  const exitMatches = useMemo(
    () => matchExitCode(graph.nodes.values(), exitCode),
    [graph, exitCode],
  );

  return (
    <div className="locate-panel">
      <p className="description">{t('locate.exitHelp')}</p>
      <label className="visually-hidden" htmlFor="locate-exit-code">
        {t('locate.exitCodeLabel')}
      </label>
      <input
        id="locate-exit-code"
        type="search"
        inputMode="text"
        autoCapitalize="characters"
        value={exitCode}
        placeholder={t('locate.exitCodePlaceholder')}
        onChange={(e) => setExitCode(e.target.value)}
      />
      {exitMatches.length > 0 && (
        <ul className="choice-list">
          {exitMatches.map((node) => (
            <li key={node.id}>
              <button type="button" className="exit-code-pick" onClick={() => onConfirm(node.id)}>
                {t('locate.exitCodePick', { exit: node.exitNo })}
                {/* 同じ番号の出口が 2 か所あるときは、どの地下街かを添える */}
                {exitMatches.filter((n) => n.exitNo === node.exitNo).length > 1 &&
                  `（${t(`area.${node.area}`)}・${nodeFloor(node)}）`}
              </button>
            </li>
          ))}
        </ul>
      )}
      {exitCode.trim() !== '' && exitMatches.length === 0 && (
        <p className="hint">{t('locate.exitCodeNone')}</p>
      )}
    </div>
  );
}
