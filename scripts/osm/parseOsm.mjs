// OSM XML（API 0.6 の map 応答）を読む最小限のパーサ。依存なし。
// 対象は node / way とその tag だけ（relation は使わない）。
import { readFileSync } from 'node:fs';

const attr = (line, name) => {
  const m = line.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** @returns {{ nodes: Map<string, {id:string, lat:number, lon:number, tags:Record<string,string>}>, ways: {id:string, nds:string[], tags:Record<string,string>}[] }} */
export function parseOsm(path) {
  const nodes = new Map();
  const ways = [];
  let current = null;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('<node ')) {
      const node = {
        id: attr(line, 'id'),
        lat: Number(attr(line, 'lat')),
        lon: Number(attr(line, 'lon')),
        tags: {},
      };
      nodes.set(node.id, node);
      current = line.endsWith('/>') ? null : node;
    } else if (line.startsWith('<way ')) {
      current = { id: attr(line, 'id'), nds: [], tags: {} };
      ways.push(current);
    } else if (line.startsWith('<relation ')) {
      current = null;
    } else if (current && line.startsWith('<nd ')) {
      current.nds.push(attr(line, 'ref'));
    } else if (current && line.startsWith('<tag ')) {
      current.tags[attr(line, 'k')] = attr(line, 'v');
    } else if (line === '</node>' || line === '</way>') {
      current = null;
    }
  }
  return { nodes, ways };
}
