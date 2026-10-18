import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import PageShell from '../../components/Layout/PageShell';
import styles from './CausalPage.module.css';

type CausalTab = 'intro' | 'dag' | 'scm' | 'cdn' | 'practice' | 'sources';
type DagTool = 'add-node' | 'add-edge' | 'delete' | 'dsep' | 'paths' | null;
type DagNode = { id: string; label: string; x: number; y: number; color: string };
type DagEdge = { source: string; target: string };

const TAB_LABELS: { id: CausalTab; label: string }[] = [
  { id: 'intro', label: 'Vue d’ensemble' },
  { id: 'dag', label: '1 · DAG' },
  { id: 'scm', label: '2 · SCM' },
  { id: 'cdn', label: '3 · Réseaux' },
  { id: 'practice', label: 'Exercices & pièges' },
  { id: 'sources', label: 'Sources' },
];

const DAG_EXAMPLES: Record<string, { name: string; nodes: DagNode[]; edges: DagEdge[]; explanations: { title: string; text: string }[] }> = {
  didactic: {
    name: 'Pédagogique : Pluie & Sol',
    nodes: [
      { id: 'Pluie', label: 'Pluie (P)', x: 120, y: 60, color: '#4a90d9' },
      { id: 'Arroseur', label: 'Arroseur (A)', x: 420, y: 60, color: '#27ae60' },
      { id: 'Parapluie', label: 'Parapluie (U)', x: 30, y: 220, color: '#f39c12' },
      { id: 'SolMouille', label: 'Sol mouillé (S)', x: 270, y: 200, color: '#e74c3c' },
      { id: 'Glissant', label: 'Glissant (G)', x: 270, y: 330, color: '#8e44ad' },
    ],
    edges: [
      { source: 'Pluie', target: 'SolMouille' },
      { source: 'Pluie', target: 'Parapluie' },
      { source: 'Arroseur', target: 'SolMouille' },
      { source: 'SolMouille', target: 'Glissant' },
    ],
    explanations: [
      { title: 'Fork · cause commune', text: 'La pluie cause à la fois le sol mouillé et le parapluie. Sans contrôler P, on observe une fausse corrélation U–S.' },
      { title: 'Collider · convergent', text: 'Le sol mouillé a deux causes (P et A). Conditionner sur S crée une dépendance spurious entre P et A : c’est le biais de collider.' },
      { title: 'Chaîne · médiateur', text: 'P → S → G forme une chaîne. S est médiateur. Conditionner sur S bloque le flux causal de P vers G.' },
    ],
  },
  tabac: {
    name: 'Réel : Tabac & Cancer',
    nodes: [
      { id: 'Tabac', label: 'Tabac (T)', x: 270, y: 70, color: '#4a90d9' },
      { id: 'Cancer', label: 'Cancer (C)', x: 120, y: 270, color: '#e74c3c' },
      { id: 'DoigtsJaunes', label: 'Doigts jaunes (D)', x: 420, y: 270, color: '#f39c12' },
    ],
    edges: [
      { source: 'Tabac', target: 'Cancer' },
      { source: 'Tabac', target: 'DoigtsJaunes' },
    ],
    explanations: [
      { title: 'Confondant', text: 'Le tabac est cause commune du cancer et des doigts jaunes. Sans le contrôler, on observe une fausse corrélation C–D.' },
      { title: 'Indépendance conditionnelle', text: 'C ⊥ D | T : en conditionnant sur le tabac, cancer et doigts jaunes deviennent indépendants dans ce DAG (d-séparation).' },
      { title: 'Données réelles', text: 'P(T)=19,3 % (WHO 2024), P(C|T=1)=17,2 % (CDC), RR ≈ 15× dans le travail historique de Doll & Hill.' },
    ],
  },
};

const DAG_TOOL_LABELS: Record<Exclude<DagTool, null>, string> = {
  'add-node': 'Cliquez sur le canevas pour ajouter un nœud.',
  'add-edge': 'Cliquez un nœud source puis un nœud cible pour créer une arête.',
  delete: 'Cliquez sur un nœud ou une arête pour le supprimer.',
  dsep: 'Cliquez A, puis B, puis les nœuds de conditionnement (vert). Le résultat se met à jour.',
  paths: 'Cliquez le nœud source puis le nœud cible pour trouver les chemins causaux.',
};

function cloneDagExample(key: string) {
  const example = DAG_EXAMPLES[key];
  return { nodes: example.nodes.map((node) => ({ ...node })), edges: example.edges.map((edge) => ({ ...edge })) };
}

function nodeLabel(nodes: DagNode[], id: string | null) {
  return nodes.find((node) => node.id === id)?.label ?? id ?? '';
}

function hasDagCycle(nodes: DagNode[], edges: DagEdge[]) {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const visit = (id: string): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const cycle = edges.filter((edge) => edge.source === id).some((edge) => visit(edge.target));
    stack.delete(id);
    return cycle;
  };
  return nodes.some((node) => visit(node.id));
}

function findUndirectedPaths(edges: DagEdge[], start: string, end: string) {
  const paths: string[][] = [];
  const walk = (current: string, path: string[]) => {
    if (current === end) {
      paths.push(path);
      return;
    }
    edges.forEach((edge) => {
      const next = edge.source === current ? edge.target : edge.target === current ? edge.source : null;
      if (next && !path.includes(next)) walk(next, [...path, next]);
    });
  };
  walk(start, [start]);
  return paths;
}

function tripletStructure(edges: DagEdge[], previous: string, current: string, next: string) {
  const prevToCurrent = edges.some((edge) => edge.source === previous && edge.target === current);
  const currentToPrev = edges.some((edge) => edge.source === current && edge.target === previous);
  const nextToCurrent = edges.some((edge) => edge.source === next && edge.target === current);
  const currentToNext = edges.some((edge) => edge.source === current && edge.target === next);
  if (prevToCurrent && nextToCurrent) return 'collider';
  if (currentToPrev && currentToNext) return 'fork';
  return 'chain';
}

function hasConditionedDescendant(edges: DagEdge[], node: string, conditioned: Set<string>) {
  const queue = [node];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current) {
        if (conditioned.has(edge.target)) return true;
        queue.push(edge.target);
      }
    }
  }
  return false;
}

function isPathActive(edges: DagEdge[], path: string[], conditioned: Set<string>) {
  for (let index = 1; index < path.length - 1; index += 1) {
    const structure = tripletStructure(edges, path[index - 1], path[index], path[index + 1]);
    if (structure === 'collider') {
      if (!conditioned.has(path[index]) && !hasConditionedDescendant(edges, path[index], conditioned)) return false;
    } else if (conditioned.has(path[index])) {
      return false;
    }
  }
  return true;
}

function dagSeparation(nodes: DagNode[], edges: DagEdge[], a: string | null, b: string | null, conditioned: Set<string>) {
  if (!a || !b) return null;
  const paths = findUndirectedPaths(edges, a, b);
  const active = paths.filter((path) => isPathActive(edges, path, conditioned));
  const condition = conditioned.size > 0 ? [...conditioned].map((id) => nodeLabel(nodes, id)).join(', ') : 'ensemble vide';
  if (active.length === 0) {
    return { kind: 'good' as const, text: `d-séparés : ${nodeLabel(nodes, a)} ⊥ ${nodeLabel(nodes, b)} | {${condition}}. Tous les chemins sont bloqués.` };
  }
  return { kind: 'bad' as const, text: `d-connectés : ${nodeLabel(nodes, a)} et ${nodeLabel(nodes, b)} restent dépendants | {${condition}}. ${active.length} chemin(s) actif(s).` };
}

function directedPaths(edges: DagEdge[], source: string | null, target: string | null) {
  if (!source || !target) return [];
  const results: string[][] = [];
  const walk = (current: string, path: string[]) => {
    if (current === target) {
      results.push(path);
      return;
    }
    edges.filter((edge) => edge.source === current).forEach((edge) => {
      if (!path.includes(edge.target)) walk(edge.target, [...path, edge.target]);
    });
  };
  walk(source, [source]);
  return results;
}

function CausalDag() {
  const [exampleKey, setExampleKey] = useState('didactic');
  const [graph, setGraph] = useState(() => cloneDagExample('didactic'));
  const [tool, setTool] = useState<DagTool>(null);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ a: string | null; b: string | null; conditioned: Set<string> }>({ a: null, b: null, conditioned: new Set() });
  const [pathSelection, setPathSelection] = useState<{ source: string | null; target: string | null }>({ source: null, target: null });
  const [result, setResult] = useState<{ kind: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const nextNode = useRef(1);

  const loadExample = (key: string) => {
    setExampleKey(key);
    setGraph(cloneDagExample(key));
    setTool(null);
    setEdgeStart(null);
    setSelection({ a: null, b: null, conditioned: new Set() });
    setPathSelection({ source: null, target: null });
    setResult(null);
  };

  const chooseTool = (next: Exclude<DagTool, null>) => {
    setTool((current) => (current === next ? null : next));
    setEdgeStart(null);
    setSelection({ a: null, b: null, conditioned: new Set() });
    setPathSelection({ source: null, target: null });
    setResult(null);
  };

  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 560, y: ((event.clientY - rect.top) / rect.height) * 400 };
  };

  const updateNodePosition = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || tool === 'add-node') return;
    const point = pointFromEvent(event);
    setGraph((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === dragging ? { ...node, x: Math.max(40, Math.min(520, point.x)), y: Math.max(30, Math.min(370, point.y)) } : node) }));
  };

  const clickNode = (id: string) => {
    if (tool === 'delete') {
      setGraph((current) => ({ nodes: current.nodes.filter((node) => node.id !== id), edges: current.edges.filter((edge) => edge.source !== id && edge.target !== id) }));
      return;
    }
    if (tool === 'add-edge') {
      if (!edgeStart) {
        setEdgeStart(id);
        return;
      }
      if (edgeStart !== id && !graph.edges.some((edge) => edge.source === edgeStart && edge.target === id)) {
        const edges = [...graph.edges, { source: edgeStart, target: id }];
        if (hasDagCycle(graph.nodes, edges)) setResult({ kind: 'bad', text: 'Cette arête créerait un cycle : un DAG doit rester acyclique.' });
        else setGraph((current) => ({ ...current, edges }));
      }
      setEdgeStart(null);
      return;
    }
    if (tool === 'dsep') {
      setSelection((current) => {
        if (!current.a) return { ...current, a: id };
        if (!current.b && current.a !== id) return { ...current, b: id };
        if (id === current.a || id === current.b) return current;
        const conditioned = new Set(current.conditioned);
        if (conditioned.has(id)) conditioned.delete(id); else conditioned.add(id);
        return { ...current, conditioned };
      });
      return;
    }
    if (tool === 'paths') {
      setPathSelection((current) => current.source && !current.target && current.source !== id ? { ...current, target: id } : { source: id, target: null });
    }
  };

  useEffect(() => {
    if (tool !== 'dsep' || !selection.a || !selection.b) return;
    setResult(dagSeparation(graph.nodes, graph.edges, selection.a, selection.b, selection.conditioned));
  }, [graph, selection, tool]);

  useEffect(() => {
    if (tool !== 'paths' || !pathSelection.source || !pathSelection.target) return;
    const paths = directedPaths(graph.edges, pathSelection.source, pathSelection.target);
    setResult(paths.length > 0
      ? { kind: 'info', text: `${paths.length} chemin(s) causal(aux) dirigé(s) : ${paths.map((path) => path.map((id) => nodeLabel(graph.nodes, id)).join(' → ')).join(' · ')}` }
      : { kind: 'bad', text: `Aucun chemin causal dirigé de ${nodeLabel(graph.nodes, pathSelection.source)} vers ${nodeLabel(graph.nodes, pathSelection.target)}.` });
  }, [graph, pathSelection, tool]);

  const addNodeAtCanvas = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool !== 'add-node' || event.target !== event.currentTarget) return;
    const name = window.prompt('Nom du nœud :');
    if (!name?.trim()) return;
    const point = pointFromEvent(event);
    const colors = ['#4a90d9', '#27ae60', '#e74c3c', '#f39c12', '#8e44ad', '#1abc9c'];
    setGraph((current) => ({ ...current, nodes: [...current.nodes, { id: `${name.trim().replace(/\s+/g, '_')}_${nextNode.current++}`, label: name.trim(), x: Math.max(40, Math.min(520, point.x)), y: Math.max(30, Math.min(370, point.y)), color: colors[current.nodes.length % colors.length] }] }));
  };

  const activeEdges = useMemo(() => {
    if (tool !== 'dsep' || !selection.a || !selection.b) return new Set<string>();
    const paths = findUndirectedPaths(graph.edges, selection.a, selection.b).filter((path) => isPathActive(graph.edges, path, selection.conditioned));
    return new Set(paths.flatMap((path) => path.slice(0, -1).map((id, index) => `${id}-${path[index + 1]}`)));
  }, [graph, selection, tool]);

  return (
    <div className={styles.module}>
      <div className={styles.moduleIntro}>
        <div>
          <p className={styles.eyebrow}>LABORATOIRE INTERACTIF · NIVEAU L3/M1</p>
          <h2>Graphe causal : les hypothèses avant les calculs</h2>
          <p>Un DAG ne prouve pas une causalité à lui seul : il rend visibles les hypothèses qui permettent de savoir quelles variables contrôler, lesquelles laisser tranquilles et quelles questions sont identifiables.</p>
        </div>
        <div className={styles.legend}>
          <span><i className={styles.dotBlue} /> cause / exposition</span>
          <span><i className={styles.dotRed} /> résultat</span>
          <span><i className={styles.dotGreen} /> conditionnement</span>
        </div>
      </div>

      <div className={styles.exampleSwitcher}>
        {Object.entries(DAG_EXAMPLES).map(([key, value]) => (
          <button key={key} className={exampleKey === key ? styles.activePill : ''} onClick={() => loadExample(key)}>{value.name}</button>
        ))}
      </div>

      <div className={styles.toolbar}>
        {([['add-node', '+ Nœud'], ['add-edge', '+ Arête'], ['delete', 'Supprimer'], ['dsep', 'd-Séparation'], ['paths', 'Chemins causaux']] as const).map(([id, label]) => (
          <button key={id} className={tool === id ? styles.toolActive : ''} onClick={() => chooseTool(id)}>{label}</button>
        ))}
        <button onClick={() => loadExample(exampleKey)}>Réinitialiser</button>
      </div>
      <p className={styles.status}>{tool ? DAG_TOOL_LABELS[tool] : 'Déplacez les nœuds ou sélectionnez un outil pour expérimenter.'}</p>

      <div className={styles.dagBoard}>
        <svg viewBox="0 0 560 400" role="img" aria-label="Graphe causal interactif" onPointerMove={updateNodePosition} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)} onPointerDown={addNodeAtCanvas}>
          <defs>
            <marker id="causalArrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="10" markerHeight="7" orient="auto"><path d="M0,0 L10,3.5 L0,7 Z" fill="#4a90d9" /></marker>
            <marker id="causalArrowOrange" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="10" markerHeight="7" orient="auto"><path d="M0,0 L10,3.5 L0,7 Z" fill="#e67e22" /></marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = graph.nodes.find((node) => node.id === edge.source);
            const target = graph.nodes.find((node) => node.id === edge.target);
            if (!source || !target) return null;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.hypot(dx, dy) || 1;
            const active = activeEdges.has(`${edge.source}-${edge.target}`) || activeEdges.has(`${edge.target}-${edge.source}`);
            return <line key={`${edge.source}-${edge.target}`} x1={source.x + (dx / distance) * 34} y1={source.y + (dy / distance) * 34} x2={target.x - (dx / distance) * 34} y2={target.y - (dy / distance) * 34} className={active ? styles.edgeActive : styles.edge} markerEnd={active ? 'url(#causalArrowOrange)' : 'url(#causalArrow)'} onClick={(event) => { event.stopPropagation(); if (tool === 'delete') setGraph((current) => ({ ...current, edges: current.edges.filter((item) => item !== edge) })); }} />;
          })}
          {graph.nodes.map((node) => {
            const selected = selection.a === node.id || selection.b === node.id || selection.conditioned.has(node.id) || pathSelection.source === node.id || pathSelection.target === node.id || edgeStart === node.id;
            const color = selection.a === node.id || pathSelection.source === node.id ? '#3498db' : selection.b === node.id || pathSelection.target === node.id ? '#e74c3c' : selection.conditioned.has(node.id) ? '#27ae60' : node.color;
            return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className={selected ? styles.nodeSelected : ''} onPointerDown={(event) => { event.stopPropagation(); setDragging(node.id); }} onClick={(event) => { event.stopPropagation(); clickNode(node.id); }}>
              <circle r="32" fill={color} fillOpacity={selected ? 0.3 : 0.14} stroke={color} strokeWidth={selected ? 3.5 : 2.5} />
              <text textAnchor="middle" dy="0.35em">{node.label}</text>
            </g>;
          })}
        </svg>
      </div>
      {result && <div className={`${styles.result} ${result.kind === 'good' ? styles.resultGood : result.kind === 'bad' ? styles.resultBad : styles.resultInfo}`}>{result.text}</div>}

      <div className={styles.explanationGrid}>
        {DAG_EXAMPLES[exampleKey].explanations.map((explanation) => <div className={styles.miniCard} key={explanation.title}><h3>{explanation.title}</h3><p>{explanation.text}</p></div>)}
      </div>
      <details className={styles.details}><summary>Lire le graphe sans se tromper</summary><p>Une flèche représente une hypothèse de direction causale, pas une simple corrélation. Un <strong>confondant</strong> est une cause commune de l’exposition et du résultat. Un <strong>médiateur</strong> est sur le chemin de l’effet et ne doit pas être contrôlé si l’on veut l’effet total. Un <strong>collider</strong> reçoit deux flèches : le contrôler peut créer une association artificielle.</p></details>
    </div>
  );
}

type ScmParam = { id: string; label: string; value: number; min: number; max: number; step: number };
type ScmExample = { key: string; title: string; description: string; equations: string; params: ScmParam[]; interventions: { value: string; label: string }[]; counterfactualQuestion: string };

const SCM_EXAMPLES: Record<string, ScmExample> = {
  didactic: {
    key: 'didactic', title: 'Pédagogique : Révision & Note', description: 'Un étudiant révise R heures et dort S heures. Les deux affectent sa note. Les équations sont linéaires pour comprendre le mécanisme.',
    equations: 'R = μ_R + ε_R   (ε_R ~ N(0,2))\nS = μ_S + ε_S   (ε_S ~ N(0,1))\nN = a × R + b × S + ε_N   (ε_N ~ N(0,σ))',
    params: [
      { id: 'muR', label: 'Moyenne révision (μ_R)', value: 4, min: 0, max: 12, step: 0.5 },
      { id: 'muS', label: 'Moyenne sommeil (μ_S)', value: 7, min: 3, max: 10, step: 0.5 },
      { id: 'aR', label: 'Effet révision (a)', value: 1.2, min: 0, max: 3, step: 0.1 },
      { id: 'aS', label: 'Effet sommeil (b)', value: 0.8, min: 0, max: 3, step: 0.1 },
      { id: 'noise', label: 'Bruit (σ)', value: 2, min: 0, max: 5, step: 0.5 },
    ],
    interventions: [{ value: 'none', label: 'Aucune intervention' }, { value: 'R_0', label: 'do(R = 0) — pas de révision' }, { value: 'R_8', label: 'do(R = 8) — 8 h de révision' }, { value: 'S_4', label: 'do(S = 4) — seulement 4 h de sommeil' }, { value: 'S_9', label: 'do(S = 9) — 9 h de sommeil' }],
    counterfactualQuestion: 'Un étudiant a révisé 2 h, dormi 6 h et obtenu 8/20. S’il avait révisé 6 h, quelle note aurait-il eue ?',
  },
  tabac: {
    key: 'tabac', title: 'Réel : Tabac & Cancer', description: 'Données épidémiologiques. Le modèle binaire distingue observation, intervention et contrefactuel.',
    equations: 'T = (U_T < p_T) ? 1 : 0\nC = (T=1) ? (U_C < p_{C|T=1}) : (U_C < p_{C|T=0})\nD = (T=1) ? (U_D < p_{D|T=1}) : (U_D < p_{D|T=0})',
    params: [
      { id: 'pT', label: 'P(T=1)', value: 0.193, min: 0, max: 1, step: 0.01 },
      { id: 'pC_T1', label: 'P(C=1|T=1)', value: 0.172, min: 0, max: 1, step: 0.01 },
      { id: 'pC_T0', label: 'P(C=1|T=0)', value: 0.013, min: 0, max: 1, step: 0.001 },
      { id: 'pD_T1', label: 'P(D=1|T=1)', value: 0.44, min: 0, max: 1, step: 0.01 },
      { id: 'pD_T0', label: 'P(D=1|T=0)', value: 0.01, min: 0, max: 1, step: 0.01 },
    ],
    interventions: [{ value: 'none', label: 'Aucune intervention (observationnel)' }, { value: 'T_1', label: 'do(T=1) — forcer tout le monde à fumer' }, { value: 'T_0', label: 'do(T=0) — forcer tout le monde à ne pas fumer' }, { value: 'D_1', label: 'do(D=1) — forcer les doigts jaunes' }, { value: 'D_0', label: 'do(D=0) — supprimer les doigts jaunes' }],
    counterfactualQuestion: 'Un patient fume et a un cancer. S’il n’avait pas fumé, aurait-il eu un cancer ?',
  },
};

const scmDefaultParams = (key: string) => Object.fromEntries(SCM_EXAMPLES[key].params.map((param) => [param.id, param.value]));

function parseIntervention(value: string) {
  if (value === 'none') return null;
  const [variable, rawValue] = value.split('_');
  return { variable, value: Number(rawValue) };
}

function deterministicNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function scmResults(key: string, params: Record<string, number>, intervention: { variable: string; value: number } | null) {
  if (key === 'didactic') {
    const r = intervention?.variable === 'R' ? intervention.value : params.muR;
    const s = intervention?.variable === 'S' ? intervention.value : params.muS;
    const expected = intervention?.variable === 'N' ? intervention.value : params.aR * r + params.aS * s;
    const samples = Array.from({ length: 10000 }, (_, index) => Math.max(0, Math.min(20, expected + deterministicNoise(index + 1) * params.noise)));
    const monteCarlo = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return [['E[R]', r.toFixed(2)], ['E[S]', s.toFixed(2)], ['E[N] · Monte Carlo (N=10 000)', monteCarlo.toFixed(2)], ['E[N] analytique', expected.toFixed(2)]];
  }
  const pC = intervention?.variable === 'T' ? (intervention.value === 1 ? params.pC_T1 : params.pC_T0) : params.pT * params.pC_T1 + (1 - params.pT) * params.pC_T0;
  const pD = intervention?.variable === 'T' ? (intervention.value === 1 ? params.pD_T1 : params.pD_T0) : params.pT * params.pD_T1 + (1 - params.pT) * params.pD_T0;
  return [['P(T=1)', (intervention?.variable === 'T' ? intervention.value : params.pT).toFixed(4)], ['P(C=1)', pC.toFixed(4)], ['P(D=1)', pD.toFixed(4)], ['P(C=1|T=1)', params.pC_T1.toFixed(4)], ['P(C=1|T=0)', params.pC_T0.toFixed(4)], ['P(C=1|D=1) · observation', (params.pT * params.pC_T1 * params.pD_T1 + (1 - params.pT) * params.pC_T0 * params.pD_T0 > 0 ? (params.pT * params.pC_T1 * params.pD_T1 + (1 - params.pT) * params.pC_T0 * params.pD_T0) / (params.pT * params.pD_T1 + (1 - params.pT) * params.pD_T0) : 0).toFixed(4)]];
}

function ScmGraph({ keyName, intervention }: { keyName: string; intervention: { variable: string; value: number } | null }) {
  const isTobacco = keyName === 'tabac';
  const nodes = isTobacco ? [{ id: 'T', x: 180, y: 75, label: 'T', color: '#27ae60' }, { id: 'C', x: 90, y: 215, label: 'C', color: '#e74c3c' }, { id: 'D', x: 270, y: 215, label: 'D', color: '#f39c12' }] : [{ id: 'R', x: 80, y: 85, label: 'R', color: '#27ae60' }, { id: 'S', x: 270, y: 85, label: 'S', color: '#2980b9' }, { id: 'N', x: 175, y: 220, label: 'N', color: '#e74c3c' }];
  const edges = isTobacco ? [['T', 'C'], ['T', 'D']] : [['R', 'N'], ['S', 'N']];
  return <svg viewBox="0 0 360 280" className={styles.scmSvg} aria-label="Graphe du modèle causal structurel">
    <defs><marker id="scmArrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="10" markerHeight="7" orient="auto"><path d="M0,0 L10,3.5 L0,7 Z" fill="#27ae60" /></marker></defs>
    {nodes.map((node, index) => <g key={`noise-${node.id}`}><circle cx={node.x} cy={index === 2 ? node.y : 20} r="13" fill="#f0f0f0" stroke="#bbb" /><text x={node.x} y={index === 2 ? node.y + 3 : 23} textAnchor="middle" fontSize="9" fill="#888">{isTobacco ? `U_${node.id}` : `ε${node.id}`}</text><line x1={node.x} y1={index === 2 ? node.y - 13 : 33} x2={node.x} y2={node.y - 25} stroke="#bbb" strokeWidth="1.5" strokeDasharray="4 3" /></g>)}
    {edges.map(([sourceId, targetId]) => { const source = nodes.find((node) => node.id === sourceId); const target = nodes.find((node) => node.id === targetId); if (!source || !target) return null; const cut = intervention?.variable === targetId; const dx = target.x - source.x; const dy = target.y - source.y; const distance = Math.hypot(dx, dy) || 1; return <line key={`${sourceId}-${targetId}`} x1={source.x + (dx / distance) * 25} y1={source.y + (dy / distance) * 25} x2={target.x - (dx / distance) * 25} y2={target.y - (dy / distance) * 25} stroke={cut ? '#999' : '#27ae60'} strokeWidth="2.5" strokeDasharray={cut ? '8 4' : undefined} opacity={cut ? 0.25 : 1} markerEnd="url(#scmArrow)" />; })}
    {nodes.map((node) => <g key={node.id}><circle cx={node.x} cy={node.y} r="24" fill={node.color} fillOpacity="0.15" stroke={node.color} strokeWidth="2.5" /><text x={node.x} y={node.y + 4} textAnchor="middle" fill="#1a1a2e" fontSize="13" fontWeight="600">{node.label}</text></g>)}
  </svg>;
}

function CausalScm() {
  const [exampleKey, setExampleKey] = useState('didactic');
  const [params, setParams] = useState<Record<string, number>>(() => scmDefaultParams('didactic'));
  const [interventionValue, setInterventionValue] = useState('none');
  const [showCounterfactual, setShowCounterfactual] = useState(false);
  const example = SCM_EXAMPLES[exampleKey];
  const intervention = parseIntervention(interventionValue);
  const results = scmResults(exampleKey, params, intervention);

  const switchExample = (key: string) => {
    setExampleKey(key);
    setParams(scmDefaultParams(key));
    setInterventionValue('none');
    setShowCounterfactual(false);
  };
  const updateParam = (id: string, value: string) => setParams((current) => ({ ...current, [id]: Number(value) }));
  const counterfactual = useMemo(() => {
    if (exampleKey === 'didactic') {
      const residual = 8 - params.aR * 2 - params.aS * 6;
      const raw = params.aR * 6 + params.aS * 6 + residual;
      return { answer: `${Math.max(0, Math.min(20, raw)).toFixed(2)}/20`, detail: `1. Abduction : ε_N = 8 − ${params.aR}×2 − ${params.aS}×6 = ${residual.toFixed(2)}\n2. Action : do(R = 6)\n3. Prediction : N = ${params.aR}×6 + ${params.aS}×6 + ${residual.toFixed(2)} = ${raw.toFixed(2)}` };
    }
    const probability = params.pC_T1 > 0 ? Math.min(params.pC_T0, params.pC_T1) / params.pC_T1 : 0;
    return { answer: `${(probability * 100).toFixed(2)} %`, detail: `1. Abduction : T=1, C=1 ⇒ U_C < ${params.pC_T1}\n2. Action : do(T = 0)\n3. Prediction : P(U_C < ${params.pC_T0}) = min(${params.pC_T0}, ${params.pC_T1}) / ${params.pC_T1} = ${probability.toFixed(4)}` };
  }, [exampleKey, params]);

  return <div className={styles.module}>
    <div className={styles.exampleSwitcher}>
      {Object.entries(SCM_EXAMPLES).map(([key, value]) => <button key={key} className={exampleKey === key ? styles.activeGreen : ''} onClick={() => switchExample(key)}>{value.title}</button>)}
    </div>
    <div className={styles.scmLayout}>
      <div>
        <p className={styles.muted}>{example.description}</p>
        <h3>Équations structurelles</h3>
        <pre className={styles.formula}>{example.equations}</pre>
        {example.params.map((param) => <label className={styles.param} key={param.id}><span>{param.label}</span><input type="number" value={params[param.id]} min={param.min} max={param.max} step={param.step} onChange={(event) => updateParam(param.id, event.target.value)} /></label>)}
        <p className={styles.note}><strong>Variable exogène :</strong> sans parent dans le graphe, sa valeur vient du bruit U. <strong>Variable endogène :</strong> elle dépend de ses parents et d’un bruit non observé. La simulation tire 10 000 bruits puis applique les équations.</p>
      </div>
      <div>
        <ScmGraph keyName={exampleKey} intervention={intervention} />
        <h3>Résultats</h3>
        <table className={styles.resultsTable}><thead><tr><th>Quantité</th><th>Valeur</th></tr></thead><tbody>{results.map(([label, value]) => <tr key={label}><td>{label}</td><td>{value}</td></tr>)}</tbody></table>
      </div>
    </div>
    <div className={styles.panelGreen}>
      <h3>Opérateur do — intervention causale</h3>
      <p><strong>do(X=x)</strong> force X à la valeur x en coupant ses causes. C’est l’analogue conceptuel d’une expérience randomisée ; observer X=x ne suffit pas.</p>
      <select value={interventionValue} onChange={(event) => setInterventionValue(event.target.value)}>{example.interventions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      {intervention ? <p className={styles.interventionResult}><strong>Intervention : do({intervention.variable} = {intervention.value})</strong><br />{exampleKey === 'tabac' && intervention.variable === 'T' ? <>P(C=1|do(T={intervention.value})) = <strong>{(intervention.value === 1 ? params.pC_T1 : params.pC_T0).toFixed(4)}</strong><br />ACE (tabac → cancer) = P(C|do(T=1)) − P(C|do(T=0)) = <strong>{(params.pC_T1 - params.pC_T0).toFixed(4)}</strong></> : exampleKey === 'tabac' && intervention.variable === 'D' ? <>Forcer les doigts jaunes n’a <strong>aucun effet</strong> sur le cancer : P(C=1|do(D={intervention.value})) = P(C=1).</> : <>E[N|do({intervention.variable}={intervention.value})] = <strong>{scmResults(exampleKey, params, intervention).at(-1)?.[1]}/20</strong>. Pour R, l’effet causal do(R=8) − do(R=0) vaut <strong>{(params.aR * 8).toFixed(2)}</strong> point(s).</>}</p> : <p className={styles.muted}>Mode observationnel : les causes de la variable restent connectées.</p>}
    </div>
    <div className={styles.panelBlue}>
      <h3>Requête contrefactuelle</h3>
      <p><strong>Question :</strong> {example.counterfactualQuestion}</p>
      <button className={styles.primaryButton} onClick={() => setShowCounterfactual(true)}>Calculer le contrefactuel</button>
      {showCounterfactual && <div className={styles.cfResult}><strong>Résultat : {exampleKey === 'didactic' ? 'note contrefactuelle = ' : 'P(cancer contrefactuel) = '}{counterfactual.answer}</strong><br /><br /><strong>Abduction → Action → Prediction :</strong><pre>{counterfactual.detail}</pre></div>}
    </div>
    <details className={styles.details}><summary>Pourquoi les bruits U comptent-ils ?</summary><p>Les bruits représentent les causes non mesurées. Dans un contrefactuel, on garde le même individu — donc le même bruit latent — et on change seulement l’action. Sans cette étape d’abduction, on comparerait deux personnes moyennes, pas le même individu dans deux mondes possibles.</p></details>
  </div>;
}

type CdnExample = { title: string; description: string; labels: string[]; keys: string[]; conditionA: string; conditionB: string; corrA: number[][]; corrB: number[][]; explanations: { title: string; text: string }[] };

const CDN_EXAMPLES: Record<string, CdnExample> = {
  didactic: { title: 'Pédagogique : Étudiants', description: 'Comparaison de corrélations entre variables chez des étudiants en période normale et en période d’examens. Les relations changent sous le stress.', labels: ['Stress', 'Sommeil', 'Sport', 'Note', 'Santé'], keys: ['Stress', 'Sommeil', 'Sport', 'Note', 'Santé'], conditionA: 'Période normale', conditionB: 'Période d’examens', corrA: [[1, -.2, .1, -.15, -.25], [-.2, 1, .3, .4, .55], [.1, .3, 1, .2, .6], [-.15, .4, .2, 1, .25], [-.25, .55, .6, .25, 1]], corrB: [[1, -.65, -.5, -.55, -.6], [-.65, 1, .1, .7, .35], [-.5, .1, 1, .05, .4], [-.55, .7, .05, 1, .15], [-.6, .35, .4, .15, 1]], explanations: [{ title: 'Stress ↔ Sommeil', text: 'La corrélation passe de −0,20 à −0,65 : en examens, stress et sommeil évoluent davantage en sens opposé.' }, { title: 'Sommeil ↔ Note', text: 'La corrélation Sommeil–Note augmente (0,40 → 0,70) : dans ce scénario, le sommeil est davantage associé à la performance.' }, { title: 'Le sport disparaît', text: 'La corrélation Sport–Note passe de 0,20 à 0,05 : une association peut changer de contexte sans que cela identifie un mécanisme causal.' }] },
  diabetes: { title: 'Réel : Gènes & Diabète T2', description: 'Réseau de co-expression génique : sujets sains versus diabétiques de type 2. Les nombres sont une illustration pédagogique inspirée de la littérature, pas une nouvelle estimation.', labels: ['INS', 'GCK', 'GLUT4', 'TNFα', 'IL6'], keys: ['INS', 'GCK', 'GLUT4', 'TNFa', 'IL6'], conditionA: 'Sain', conditionB: 'Diabétique T2', corrA: [[1, .82, .75, -.12, -.08], [.82, 1, .7, -.1, -.06], [.75, .7, 1, -.18, -.15], [-.12, -.1, -.18, 1, .6], [-.08, -.06, -.15, .6, 1]], corrB: [[1, .38, .28, -.52, -.48], [.38, 1, .32, -.4, -.35], [.28, .32, 1, -.58, -.52], [-.52, -.4, -.58, 1, .82], [-.48, -.35, -.52, .82, 1]], explanations: [{ title: 'Co-expression métabolique', text: 'INS, GCK, GLUT4 : les corrélations chutent (0,7–0,8 → 0,3–0,4). La co-régulation métabolique semble perturbée dans cette illustration.' }, { title: 'Axe inflammatoire', text: 'TNFα–IL6 : la corrélation augmente (0,60 → 0,82). Ce signal est compatible avec une coordination inflammatoire plus forte, sans prouver la direction.' }, { title: 'Liens croisés', text: 'Les corrélations négatives métabolisme ↔ inflammation s’amplifient, ce qui suggère un antagonisme à étudier, pas une causalité établie.' }] },
};

function diffMatrix(first: number[][], second: number[][]) { return first.map((row, i) => row.map((value, j) => second[i][j] - value)); }

function correlationColor(value: number, differential: boolean) {
  const amount = Math.min(1, Math.abs(value) / (differential ? 0.65 : 1));
  if (differential) return value >= 0 ? `rgba(230,126,34,${0.16 + amount * 0.84})` : `rgba(142,68,173,${0.16 + amount * 0.84})`;
  return value >= 0 ? `rgba(52,152,219,${0.12 + amount * 0.88})` : `rgba(231,76,60,${0.12 + amount * 0.88})`;
}

function CausalHeatmap({ matrix, labels, differential = false }: { matrix: number[][]; labels: string[]; differential?: boolean }) {
  return <div className={styles.heatmap} style={{ '--heatmap-size': `${labels.length + 1}fr` } as CSSProperties}><div /><div className={styles.heatmapLabels}>{labels.map((label) => <span key={label}>{label}</span>)}</div>{matrix.map((row, i) => <div className={styles.heatmapRow} key={labels[i]}><span>{labels[i]}</span>{row.map((value, j) => <span className={styles.heatCell} title={`${labels[i]} — ${labels[j]} : ${differential ? 'Δ' : ''}r = ${value.toFixed(2)}`} style={{ background: i === j && !differential ? '#eef0f3' : correlationColor(value, differential), color: Math.abs(value) > 0.5 ? '#fff' : '#253044' }} key={`${i}-${j}`}>{value.toFixed(2)}</span>)}</div>)}</div>;
}

function CausalNetwork({ matrix, labels, differential, threshold }: { matrix: number[][]; labels: string[]; differential: boolean; threshold: number }) {
  const size = 300;
  const positions = labels.map((_, index) => { const angle = (2 * Math.PI * index) / labels.length - Math.PI / 2; return { x: 150 + 100 * Math.cos(angle), y: 150 + 100 * Math.sin(angle) }; });
  return <svg viewBox={`0 0 ${size} ${size}`} className={styles.network} aria-label="Réseau de corrélations">
    {matrix.flatMap((row, i) => row.map((value, j) => i < j ? { value, i, j } : null).filter((edge): edge is { value: number; i: number; j: number } => edge !== null)).filter((edge) => !differential || Math.abs(edge.value) > threshold).map((edge) => <line key={`${edge.i}-${edge.j}`} x1={positions[edge.i].x} y1={positions[edge.i].y} x2={positions[edge.j].x} y2={positions[edge.j].y} stroke={differential ? edge.value >= 0 ? '#e67e22' : '#8e44ad' : edge.value >= 0 ? '#3498db' : '#e74c3c'} strokeWidth={Math.max(1, Math.abs(edge.value) * 6)} opacity={differential ? 0.82 : Math.max(0.3, Math.abs(edge.value))} />)}
    {positions.map((position, index) => <g key={labels[index]}><circle cx={position.x} cy={position.y} r="22" fill={index < 3 ? '#8e44ad' : '#e74c3c'} fillOpacity="0.15" stroke={index < 3 ? '#8e44ad' : '#e74c3c'} strokeWidth="2" /><text x={position.x} y={position.y + 3} textAnchor="middle" fontSize="10" fontWeight="600" fill="#1a1a2e">{labels[index]}</text></g>)}
  </svg>;
}

function CausalCdn() {
  const [exampleKey, setExampleKey] = useState('didactic');
  const [threshold, setThreshold] = useState(0.15);
  const [matrixA, setMatrixA] = useState(() => CDN_EXAMPLES.didactic.corrA.map((row) => [...row]));
  const [matrixB, setMatrixB] = useState(() => CDN_EXAMPLES.didactic.corrB.map((row) => [...row]));
  const example = CDN_EXAMPLES[exampleKey];
  const diff = diffMatrix(matrixA, matrixB);
  const changes = diff.flatMap((row, i) => row.map((value, j) => i < j ? { i, j, value, abs: Math.abs(value) } : null).filter((change): change is { i: number; j: number; value: number; abs: number } => change !== null)).sort((a, b) => b.abs - a.abs);
  const degrees = example.labels.map((_, i) => diff[i].filter((value, j) => i !== j && Math.abs(value) > threshold).length);
  const hub = degrees.indexOf(Math.max(...degrees));
  const resetExample = (key: string) => { setExampleKey(key); setMatrixA(CDN_EXAMPLES[key].corrA.map((row) => [...row])); setMatrixB(CDN_EXAMPLES[key].corrB.map((row) => [...row])); };
  const updateMatrix = (which: 'A' | 'B', i: number, j: number, value: string) => { const numeric = Math.max(-1, Math.min(1, Number(value) || 0)); const setter = which === 'A' ? setMatrixA : setMatrixB; setter((current) => current.map((row, rowIndex) => row.map((cell, columnIndex) => rowIndex === i && columnIndex === j ? numeric : rowIndex === j && columnIndex === i ? numeric : cell))); };
  return <div className={styles.module}>
    <div className={styles.exampleSwitcher}>{Object.entries(CDN_EXAMPLES).map(([key, value]) => <button key={key} className={exampleKey === key ? styles.activePurple : ''} onClick={() => resetExample(key)}>{value.title}</button>)}</div>
    <p className={styles.muted}>{example.description}</p>
    <div className={styles.networkGrid}><div><h3>{example.conditionA}</h3><CausalNetwork matrix={matrixA} labels={example.labels} differential={false} threshold={threshold} /></div><div><h3>{example.conditionB}</h3><CausalNetwork matrix={matrixB} labels={example.labels} differential={false} threshold={threshold} /></div><div><h3>Différentiel</h3><CausalNetwork matrix={diff} labels={example.labels} differential threshold={threshold} /></div></div>
    <label className={styles.rangeControl}>Seuil : <input type="range" min="0" max="0.5" step="0.01" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /><code>{threshold.toFixed(2)}</code></label>
    <div className={styles.cdnStats}><div><strong>Top 3 arêtes modifiées</strong>{changes.slice(0, 3).map((change) => <span key={`${change.i}-${change.j}`}>{example.labels[change.i]} — {example.labels[change.j]} : Δr = {change.value >= 0 ? '+' : ''}{change.value.toFixed(2)}</span>)}</div><div><strong>Nœud hub différentiel</strong><span>{example.labels[hub]} avec {degrees[hub]} arête(s) au-dessus du seuil</span></div><div><strong>Score de perturbation total</strong><span>Σ|Δr| = {changes.reduce((sum, change) => sum + change.abs, 0).toFixed(2)}</span><small>Somme des changements absolus de corrélation</small></div></div>
    <div className={styles.heatmapGrid}><div><h3>{example.conditionA}</h3><CausalHeatmap matrix={matrixA} labels={example.labels} /></div><div><h3>{example.conditionB}</h3><CausalHeatmap matrix={matrixB} labels={example.labels} /></div><div><h3>Δr = B − A</h3><CausalHeatmap matrix={diff} labels={example.labels} differential /></div></div>
    <div className={styles.matrixEditors}><MatrixEditor label={example.conditionA} matrix={matrixA} labels={example.labels} which="A" onChange={updateMatrix} /><MatrixEditor label={example.conditionB} matrix={matrixB} labels={example.labels} which="B" onChange={updateMatrix} /></div>
    <div className={styles.explanationGrid}>{example.explanations.map((item) => <div className={styles.miniCard} key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}</div>
    <div className={styles.warning}><strong>Attention — corrélation ≠ causalité.</strong> Un réseau de corrélations décrit des dépendances et leurs changements entre deux conditions. Il ne donne pas automatiquement le sens des flèches, ne contrôle pas les confondants et ne remplace pas un DAG, une expérience ou une analyse longitudinale.</div>
    <details className={styles.details}><summary>Comment lire une heatmap ?</summary><p>r=1 signifie association linéaire positive parfaite, r=−1 négative parfaite et r=0 absence d’association linéaire. La diagonale vaut 1 par construction et ne doit pas être interprétée comme une découverte. Le seuil masque les petites différences pour rendre le réseau lisible, mais il ne transforme pas un seuil visuel en test statistique.</p></details>
  </div>;
}

function MatrixEditor({ label, matrix, labels, which, onChange }: { label: string; matrix: number[][]; labels: string[]; which: 'A' | 'B'; onChange: (which: 'A' | 'B', i: number, j: number, value: string) => void }) {
  return <div className={styles.matrixEditor}><h3>{label}</h3><table><thead><tr><th />{labels.map((labelItem) => <th key={labelItem}>{labelItem}</th>)}</tr></thead><tbody>{matrix.map((row, i) => <tr key={labels[i]}><th>{labels[i]}</th>{row.map((value, j) => <td key={`${i}-${j}`}><input disabled={i >= j} type="number" min="-1" max="1" step="0.05" value={value.toFixed(2)} onChange={(event) => onChange(which, i, j, event.target.value)} /></td>)}</tr>)}</tbody></table></div>;
}

function PracticeSection() {
  return <div className={styles.module}>
    <div className={styles.sectionHeading}><p className={styles.eyebrow}>MÉTHODE DE RAISONNEMENT</p><h2>Avant de calculer, posez la question causale</h2><p>Chaque exercice demande d’abord de traduire une histoire en variables, d’indiquer ce qui est observé ou manipulé, puis de choisir l’estimand. Ouvrez le corrigé seulement après avoir formulé votre réponse.</p></div>
    <div className={styles.exerciseGrid}>
      <details className={styles.exercise}><summary><span>01</span> Le café améliore-t-il les notes ?</summary><div><p>On observe que les étudiants qui boivent plus de café ont parfois de meilleures notes. Faut-il conseiller le café ?</p><h4>Corrigé</h4><p>Pas avec cette seule association : le temps de révision, le niveau initial et le stress peuvent être des confondants. Un DAG minimal est <code>Révision → Café</code> possible, <code>Révision → Note</code>, et <code>Café → Note</code> hypothétique. Il faut définir l’intervention (une dose précise, à quel moment), la population et le résultat avant de parler d’effet causal.</p></div></details>
      <details className={styles.exercise}><summary><span>02</span> Faut-il contrôler le médiateur ?</summary><div><p>Un programme d’exercice agit sur la santé via la tension artérielle. On veut mesurer son effet total.</p><h4>Corrigé</h4><p>Ne contrôlez pas la tension si l’estimand est l’effet total : <code>Exercice → Tension → Santé</code> est précisément le mécanisme recherché. La contrôler estime plutôt un effet direct, sous des hypothèses supplémentaires.</p></div></details>
      <details className={styles.exercise}><summary><span>03</span> Pourquoi les hôpitaux peuvent créer un biais ?</summary><div><p>On étudie le lien entre traitement et guérison uniquement chez les patients hospitalisés.</p><h4>Corrigé</h4><p>L’hospitalisation peut être un collider : traitement → hospitalisation ← gravité, ou encore un descendant de plusieurs causes. Conditionner sur une sélection commune peut ouvrir une association artificielle. Il faut réfléchir à la population cible et au mécanisme de sélection.</p></div></details>
      <details className={styles.exercise}><summary><span>04</span> Différence, ratio ou probabilité ?</summary><div><p>Dans l’exemple tabac, on trouve 17,2 % contre 1,3 %. Quel est l’effet ?</p><h4>Corrigé</h4><p>La différence de risques vaut 0,172−0,013=0,159, soit 15,9 points de pourcentage. Le ratio vaut environ 13,2. Un odds ratio ne serait ni une différence ni un risque relatif : annoncer l’estimand évite de mélanger des questions différentes.</p></div></details>
      <details className={styles.exercise}><summary><span>05</span> Une corrélation qui change est-elle causale ?</summary><div><p>Dans le réseau étudiant, Sommeil–Note passe de 0,40 à 0,70 en période d’examens. Peut-on conclure que dormir une heure de plus augmente la note de 0,30 ?</p><h4>Corrigé</h4><p>Non. La différence de corrélation est descriptive. Les distributions, les confondants, la sélection et le bruit peuvent changer. Pour un effet causal, il faut une intervention ou un design d’identification et une incertitude quantifiée.</p></div></details>
      <details className={styles.exercise}><summary><span>06</span> Qu’est-ce qui rend une expérience crédible ?</summary><div><p>Une étude randomise une invitation à suivre un programme, mais certains invités ne le suivent pas.</p><h4>Corrigé</h4><p>L’intention de traiter compare les groupes assignés et reste protégée par la randomisation. L’effet chez les participants effectifs demande des hypothèses supplémentaires (par exemple exclusion et monotonicité pour un effet local). Ne remplacez pas automatiquement l’assignation par l’adhésion observée.</p></div></details>
    </div>
    <div className={styles.annexGrid}>
      <article><span>Annexe A</span><h3>Potentiels résultats</h3><p>Pour chaque individu, Y(1) est le résultat sous traitement et Y(0) sous contrôle. L’effet individuel Y(1)−Y(0) est généralement impossible à observer simultanément ; l’ATE est une moyenne définie sur une population.</p></article>
      <article><span>Annexe B</span><h3>Effets hétérogènes</h3><p>Un ATE moyen peut masquer des réponses opposées. Demandez : pour qui l’effet est-il estimé ? Un effet conditionnel n’est pas automatiquement causal sans gérer les confondants de la stratification.</p></article>
      <article><span>Annexe C</span><h3>Temps, immortalité et post-traitement</h3><p>Une variable mesurée après le traitement peut être médiatrice ou collidante. Les fenêtres temporelles, le temps zéro et l’éligibilité doivent être définis avant d’examiner le résultat.</p></article>
      <article><span>Annexe D</span><h3>Transportabilité</h3><p>Un effet identifié dans une étude peut ne pas se transporter à une autre population, période ou dose. Comparez l’éligibilité, le traitement, la mesure du résultat et les confondants suffisants.</p></article>
    </div>
  </div>;
}

function SourcesSection() {
  return <div className={styles.module}>
    <div className={styles.sectionHeading}><p className={styles.eyebrow}>POUR ALLER PLUS LOIN</p><h2>Sources et limites des exemples</h2><p>Les valeurs affichées dans les simulateurs sont des supports pédagogiques. Elles ne remplacent ni les données originales ni une analyse statistique complète.</p></div>
    <div className={styles.sourcesGrid}>
      <article><h3>Fondations de l’inférence causale</h3><ul><li><a href="https://bayes.cs.ucla.edu/BOOK-2K/" target="_blank" rel="noreferrer">Judea Pearl, Causality</a> — DAG, d-séparation, do-calculus et contrefactuels.</li><li><a href="https://www.hsph.harvard.edu/miguel-hernan/causal-inference-book/" target="_blank" rel="noreferrer">Hernán & Robins, Causal Inference: What If</a> — manuel gratuit sur les potentiels résultats, les essais et les études observationnelles.</li><li><a href="https://dagitty.net/" target="_blank" rel="noreferrer">DAGitty</a> — outil pour dessiner des DAG et explorer les ajustements admissibles.</li></ul></article>
      <article><h3>Exemple tabac & cancer</h3><ul><li><a href="https://www.who.int/news/item/16-01-2024-tobacco-use-declines-despite-tobacco-industry-efforts-to-jeopardize-progress" target="_blank" rel="noreferrer">WHO, rapport de tendances 2024</a> — ordre de grandeur de la prévalence du tabac ; les éditions et estimations évoluent.</li><li><a href="https://www.bmj.com/content/2/4682/739" target="_blank" rel="noreferrer">Doll & Hill (1950), BMJ</a> — étude cas-témoins historique, à lire avec son contexte méthodologique.</li><li><a href="https://www.cdc.gov/cancer/risk-factors/tobacco.html" target="_blank" rel="noreferrer">CDC, tabac et cancer</a> — ressource actuelle sur les risques et les limites de l’interprétation.</li><li><a href="https://pubmed.ncbi.nlm.nih.gov/22052329/" target="_blank" rel="noreferrer">Pesch et al. (2012), International Journal of Cancer</a> — analyse groupée des risques relatifs selon les sous-types de cancer.</li></ul></article>
      <article><h3>Réseaux et génétique</h3><ul><li><a href="https://www.nature.com/articles/nature07331" target="_blank" rel="noreferrer">Novembre et al. (2008), Nature</a> — l’ACP génétique reflète la géographie européenne ; une structure statistique n’est pas une preuve causale.</li><li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2336811/" target="_blank" rel="noreferrer">Keller et al. (2008), réseau de co-expression du diabète</a> — source citée par le prototype, utile pour distinguer co-expression et causalité.</li><li><a href="https://pubmed.ncbi.nlm.nih.gov/21980352/" target="_blank" rel="noreferrer">Valcárcel et al. (2011), PLOS ONE</a> — approche de réseau différentiel entre états biologiques.</li><li><a href="https://pubmed.ncbi.nlm.nih.gov/16362280/" target="_blank" rel="noreferrer">Westerbacka et al. (2006), Diabetologia</a> — exemple de mesure d’expression génique et d’insulinorésistance ; ce n’est pas une validation des matrices du simulateur.</li><li><a href="https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2025.1541261/full" target="_blank" rel="noreferrer">Liu et al. (2025), Frontiers in Endocrinology</a> — analyse différentielle et corrélationnelle récente, à lire comme étude d’association.</li></ul></article>
    </div>
    <div className={styles.warning}><strong>Transparence :</strong> le prototype `Test` citait aussi Zhang et al. (2008), Diabetologia 2005, Gill et al. (2011) et un article Frontiers 2025. Les références ci-dessus gardent l’idée du module, mais privilégient les pages éditeur/PubMed directement identifiables et signalent clairement quand une matrice est illustrative.</div>
  </div>;
}

function IntroSection({ onNavigate }: { onNavigate: (tab: CausalTab) => void }) {
  return <div className={styles.module}>
    <div className={styles.heroPanel}><div><p className={styles.eyebrow}>COURS INTERACTIF · INFÉRENCE CAUSALE</p><h2>Passer de « deux variables vont ensemble » à « que se passerait-il si… ? »</h2><p>Ce parcours reprend le laboratoire DAG / SCM / réseau différentiel et l’inscrit dans le style de TeachStat : une idée, un exemple, une manipulation, puis un exercice dont le corrigé reste caché.</p><div className={styles.heroActions}><button className={styles.primaryButton} onClick={() => onNavigate('dag')}>Commencer par les DAG</button><button className={styles.secondaryButton} onClick={() => onNavigate('practice')}>Voir les exercices</button></div></div><div className={styles.causalFormula}><span>observation</span><strong>P(Y | X=x)</strong><span>≠ en général ≠</span><strong>P(Y | do(X=x))</strong><span>intervention</span></div></div>
    <div className={styles.learningGrid}><article><span>01</span><h3>Dessiner les hypothèses</h3><p>Les DAG rendent visibles les causes communes, les médiateurs, les colliders et la sélection.</p><button onClick={() => onNavigate('dag')}>Explorer le DAG →</button></article><article><span>02</span><h3>Calculer une intervention</h3><p>Les SCM traduisent un graphe en équations, simulent les bruits et montrent l’opérateur do.</p><button onClick={() => onNavigate('scm')}>Ouvrir le SCM →</button></article><article><span>03</span><h3>Ne pas surinterpréter un réseau</h3><p>Les heatmaps comparent des associations entre conditions, avec une alerte sur la causalité.</p><button onClick={() => onNavigate('cdn')}>Comparer les réseaux →</button></article></div>
    <div className={styles.callout}><strong>Fil directeur :</strong> l’identification vient d’un design et d’hypothèses explicites ; un calcul précis sur une mauvaise question reste une mauvaise réponse.</div>
  </div>;
}

export function Component() {
  const [activeTab, setActiveTab] = useState<CausalTab>('intro');
  return <PageShell title="Inférence causale" subtitle="DAG, modèles structurels, interventions et réseaux différentiels — avec exemples, manipulations et exercices." breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Inférence causale' }]}>
    <nav className={styles.tabs} aria-label="Chapitres du cours">{TAB_LABELS.map((tab) => <button key={tab.id} className={activeTab === tab.id ? styles.tabActive : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>
    {activeTab === 'intro' && <IntroSection onNavigate={setActiveTab} />}
    {activeTab === 'dag' && <><div className={styles.sectionHeading}><p className={styles.eyebrow}>CHAPITRE 1</p><h2>Graphe Acyclique Dirigé (DAG)</h2><p>Construisez un graphe, testez la d-séparation et repérez les chemins causaux. Les couleurs reprennent le laboratoire original, adaptées aux cartes TeachStat.</p></div><CausalDag /></>}
    {activeTab === 'scm' && <><div className={styles.sectionHeading}><p className={styles.eyebrow}>CHAPITRE 2</p><h2>Modèle Causal Structurel (SCM)</h2><p>Associez une équation à chaque variable, simulez les bruits, intervenez avec do(X=x) et calculez un contrefactuel.</p></div><CausalScm /></>}
    {activeTab === 'cdn' && <><div className={styles.sectionHeading}><p className={styles.eyebrow}>CHAPITRE 3</p><h2>Réseau causal différentiel — avec prudence</h2><p>Comparez les dépendances entre deux conditions, modifiez les matrices et voyez les changements sur les heatmaps.</p></div><CausalCdn /></>}
    {activeTab === 'practice' && <><div className={styles.sectionHeading}><p className={styles.eyebrow}>CHAPITRE 4</p><h2>Exercices, pièges et sujets annexes</h2></div><PracticeSection /></>}
    {activeTab === 'sources' && <SourcesSection />}
  </PageShell>;
}
