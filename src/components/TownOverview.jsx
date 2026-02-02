import React from 'react';

const ROLES = [
  { id: 'mayor', label: 'Mayor', x: 250, y: 40 },
  { id: 'deacon', label: 'Deacon', x: 250, y: 120 },
  { id: 'witness', label: 'Witness', x: 420, y: 120 },
  { id: 'refinery', label: 'Refinery', x: 420, y: 200 },
  { id: 'polecat', label: 'Polecats', x: 250, y: 200 },
];

const EDGES = [
  ['mayor', 'deacon'],
  ['mayor', 'witness'],
  ['deacon', 'polecat'],
  ['witness', 'refinery'],
  ['witness', 'polecat'],
];

function getPos(id) {
  return ROLES.find(r => r.id === id);
}

export default function TownOverview({ agents, sessions }) {
  const activeSet = new Set();
  for (const a of agents) {
    const name = (a.title || '').toLowerCase();
    for (const r of ROLES) {
      if (name.includes(r.id)) activeSet.add(r.id);
    }
  }
  for (const s of sessions || []) {
    const name = (s.name || '').toLowerCase();
    for (const r of ROLES) {
      if (name.includes(r.id)) activeSet.add(r.id);
    }
  }

  return (
    <svg className="town-svg" viewBox="0 0 540 260" width="100%" height="100%">
      {EDGES.map(([from, to], i) => {
        const a = getPos(from), b = getPos(to);
        return <line key={i} className="edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {ROLES.map(r => (
        <g key={r.id} className={`node ${activeSet.has(r.id) ? 'node-active' : ''}`}>
          <rect x={r.x - 50} y={r.y - 18} width={100} height={36} />
          <text className="node-label" x={r.x} y={r.y - 2}>{r.label}</text>
          <text className="node-status" x={r.x} y={r.y + 12}>
            {activeSet.has(r.id) ? 'active' : 'idle'}
          </text>
        </g>
      ))}
    </svg>
  );
}
