import React, { useState, useRef, useEffect } from 'react';

const NODE_W = 100;
const NODE_H = 36;
const RIG_PAD = 16;
const RIG_GAP = 40;
const COL_START_X = 320;
const COL_WIDTH = 200;
const MAYOR_POS = { x: 160, y: 40 };
const DEACON_POS = { x: 80, y: 130 };
const BOOT_POS = { x: 80, y: 220 };

function buildTopology(config) {
  const nodes = [];
  const edges = [];
  const rigGroups = [];

  // Fixed nodes
  nodes.push({ id: 'mayor', label: 'Mayor', shape: 'hexagon', x: MAYOR_POS.x, y: MAYOR_POS.y, role: 'mayor' });
  nodes.push({ id: 'deacon', label: 'Deacon', shape: 'diamond', x: DEACON_POS.x, y: DEACON_POS.y, role: 'deacon' });
  nodes.push({ id: 'boot', label: 'Boot', shape: 'rect', x: BOOT_POS.x, y: BOOT_POS.y, role: 'boot' });

  edges.push({ from: 'mayor', to: 'deacon' });
  edges.push({ from: 'deacon', to: 'boot' });

  const rigs = config?.rigs || {};
  const rigNames = Object.keys(rigs);

  rigNames.forEach((rigName, i) => {
    const cx = COL_START_X + i * (COL_WIDTH + RIG_GAP);
    const witnessY = 60;
    const refineryY = 140;
    const polecatsY = 220;

    const wId = `witness-${rigName}`;
    const rId = `refinery-${rigName}`;
    const pId = `polecats-${rigName}`;

    nodes.push({ id: wId, label: 'Witness', shape: 'circle', x: cx, y: witnessY, role: 'witness', rig: rigName });
    nodes.push({ id: rId, label: 'Refinery', shape: 'rect', x: cx, y: refineryY, role: 'refinery', rig: rigName });
    nodes.push({ id: pId, label: 'Polecats', shape: 'cluster', x: cx, y: polecatsY, role: 'polecat', rig: rigName });

    edges.push({ from: 'mayor', to: wId });
    edges.push({ from: wId, to: rId });
    edges.push({ from: wId, to: pId });
    edges.push({ from: 'deacon', to: wId });

    rigGroups.push({
      name: rigName,
      x: cx - NODE_W / 2 - RIG_PAD,
      y: witnessY - NODE_H / 2 - RIG_PAD - 14,
      w: NODE_W + RIG_PAD * 2,
      h: (polecatsY - witnessY) + NODE_H + RIG_PAD * 2 + 14,
    });
  });

  const rigCount = Math.max(rigNames.length, 1);
  const svgW = Math.max(540, COL_START_X + rigCount * (COL_WIDTH + RIG_GAP) + 40);
  const svgH = Math.max(260, BOOT_POS.y + NODE_H / 2 + 30);

  return { nodes, edges, rigGroups, svgW, svgH };
}

function isNodeActive(node, agents, sessions) {
  const check = (name) => {
    const n = (name || '').toLowerCase();
    if (node.rig) {
      return n.includes(node.role) && n.includes(node.rig);
    }
    return n.includes(node.role);
  };
  for (const a of agents) {
    if (check(a.title)) return true;
  }
  for (const s of sessions || []) {
    if (check(s.name)) return true;
  }
  return false;
}

function getNodePos(nodes, id) {
  return nodes.find(n => n.id === id);
}

function curvePath(ax, ay, bx, by) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const off = Math.min(Math.abs(dx), Math.abs(dy)) * 0.25;
  const cx = mx - (dy > 0 ? off : -off) * 0.3;
  const cy = my + (dx > 0 ? off : -off) * 0.3;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

// Node shape renderers
function HexagonShape({ x, y, active }) {
  const w = 52, h = 30;
  const pts = [
    [x - w / 2, y],
    [x - w / 2 + 12, y - h / 2],
    [x + w / 2 - 12, y - h / 2],
    [x + w / 2, y],
    [x + w / 2 - 12, y + h / 2],
    [x - w / 2 + 12, y + h / 2],
  ].map(p => p.join(',')).join(' ');
  return <polygon points={pts} className={`node-shape ${active ? 'shape-active' : ''}`} />;
}

function DiamondShape({ x, y, active }) {
  const s = 24;
  const pts = [
    [x, y - s],
    [x + s, y],
    [x, y + s],
    [x - s, y],
  ].map(p => p.join(',')).join(' ');
  return <polygon points={pts} className={`node-shape ${active ? 'shape-active' : ''}`} />;
}

function CircleShape({ x, y, active }) {
  return <circle cx={x} cy={y} r={22} className={`node-shape ${active ? 'shape-active' : ''}`} />;
}

function RectShape({ x, y, active }) {
  return <rect x={x - NODE_W / 2} y={y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={6} className={`node-shape ${active ? 'shape-active' : ''}`} />;
}

function ClusterShape({ x, y, active }) {
  const cls = `node-shape ${active ? 'shape-active' : ''}`;
  return (
    <g>
      <circle cx={x - 14} cy={y - 6} r={10} className={cls} />
      <circle cx={x + 14} cy={y - 6} r={10} className={cls} />
      <circle cx={x} cy={y + 8} r={10} className={cls} />
    </g>
  );
}

function NodeShape({ node, active }) {
  const { x, y, shape } = node;
  switch (shape) {
    case 'hexagon': return <HexagonShape x={x} y={y} active={active} />;
    case 'diamond': return <DiamondShape x={x} y={y} active={active} />;
    case 'circle': return <CircleShape x={x} y={y} active={active} />;
    case 'cluster': return <ClusterShape x={x} y={y} active={active} />;
    default: return <RectShape x={x} y={y} active={active} />;
  }
}

function Tooltip({ node, active, x, y }) {
  const label = node.rig ? `${node.label} (${node.rig})` : node.label;
  const status = active ? 'Active' : 'Idle';
  const w = 140, h = 40;
  const tx = x - w / 2;
  const ty = y - NODE_H / 2 - h - 8;
  return (
    <g className="tooltip-group" style={{ pointerEvents: 'none' }}>
      <rect x={tx} y={ty} width={w} height={h} rx={4} className="tooltip-bg" />
      <text x={tx + 8} y={ty + 15} className="tooltip-label">{label}</text>
      <text x={tx + 8} y={ty + 30} className={`tooltip-status ${active ? 'tooltip-active' : 'tooltip-idle'}`}>{status}</text>
    </g>
  );
}

function MailDot({ path }) {
  return (
    <circle r={4} className="mail-dot">
      <animateMotion dur="1.2s" repeatCount="1" fill="freeze" path={path} />
    </circle>
  );
}

export default function TownOverview({ agents, sessions, config }) {
  const [hovered, setHovered] = useState(null);
  const [mailFlows, setMailFlows] = useState([]);
  const prevMailCount = useRef(0);

  const { nodes, edges, rigGroups, svgW, svgH } = buildTopology(config);

  // Detect mail count changes to trigger flow animation
  const mailCount = (agents || []).reduce((sum, a) => sum + (a.mail_count || 0), 0);
  useEffect(() => {
    if (prevMailCount.current !== 0 && mailCount !== prevMailCount.current && edges.length > 0) {
      // Pick a random edge for animation
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const from = getNodePos(nodes, edge.from);
      const to = getNodePos(nodes, edge.to);
      if (from && to) {
        const id = Date.now();
        const path = curvePath(from.x, from.y, to.x, to.y);
        setMailFlows(prev => [...prev, { id, path }]);
        setTimeout(() => setMailFlows(prev => prev.filter(f => f.id !== id)), 1300);
      }
    }
    prevMailCount.current = mailCount;
  }, [mailCount]);

  const handleClick = (node) => {
    const role = node.rig ? `${node.role}-${node.rig}` : node.role;
    const el = document.querySelector(`[data-agent-role="${role}"]`) ||
               document.querySelector(`.agent-card`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <svg className="town-svg" viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rig group backgrounds */}
      {rigGroups.map(rg => (
        <g key={rg.name}>
          <rect
            x={rg.x} y={rg.y} width={rg.w} height={rg.h}
            className="rig-group-rect"
          />
          <text x={rg.x + rg.w / 2} y={rg.y + 12} className="rig-group-label">
            {rg.name}
          </text>
        </g>
      ))}

      {/* Edges */}
      {edges.map((e, i) => {
        const a = getNodePos(nodes, e.from);
        const b = getNodePos(nodes, e.to);
        if (!a || !b) return null;
        return (
          <path
            key={i}
            className="edge"
            d={curvePath(a.x, a.y, b.x, b.y)}
          />
        );
      })}

      {/* Mail flow animations */}
      {mailFlows.map(f => <MailDot key={f.id} path={f.path} />)}

      {/* Nodes */}
      {nodes.map(node => {
        const active = isNodeActive(node, agents || [], sessions);
        return (
          <g
            key={node.id}
            className={`node ${active ? 'node-active' : ''}`}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleClick(node)}
          >
            <NodeShape node={node} active={active} />
            <text className="node-label" x={node.x} y={node.shape === 'cluster' ? node.y - 22 : node.y - 2}>
              {node.label}
            </text>
            <text className="node-status" x={node.x} y={node.shape === 'cluster' ? node.y + 22 : node.y + 12}>
              {active ? 'active' : 'idle'}
            </text>
          </g>
        );
      })}

      {/* Tooltip */}
      {hovered && (() => {
        const node = nodes.find(n => n.id === hovered);
        if (!node) return null;
        const active = isNodeActive(node, agents || [], sessions);
        return <Tooltip node={node} active={active} x={node.x} y={node.y} />;
      })()}
    </svg>
  );
}
