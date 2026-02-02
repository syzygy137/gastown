import React, { useState, useMemo } from 'react';

const NODE_R = 14;
const COL_GAP = 140;
const ROW_GAP = 44;
const PAD = 30;
const LABEL_MAX = 18;

function normStatus(status) {
  return (status || 'open').toLowerCase().replace('_', '-');
}

function statusColor(status) {
  const s = normStatus(status);
  if (s === 'closed' || s === 'done') return 'var(--green)';
  if (s === 'in-progress') return 'var(--yellow)';
  if (s === 'blocked') return 'var(--red)';
  return 'var(--text-dim)';
}

function statusGlow(status) {
  const s = normStatus(status);
  if (s === 'closed' || s === 'done') return 'rgba(90,158,62,0.5)';
  if (s === 'in-progress') return 'rgba(212,160,23,0.5)';
  if (s === 'blocked') return 'rgba(181,68,46,0.5)';
  return 'rgba(138,125,101,0.25)';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function bezierPath(x1, y1, x2, y2) {
  const dx = (x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export default function ConvoyGraph({ issues, dependencies, agents, onDrillIssue }) {
  const [expandedId, setExpandedId] = useState(null);

  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    const workItems = issues.filter(i =>
      i.issue_type !== 'agent' && i.issue_type !== 'message'
    );
    if (!workItems.length) return { nodes: [], edges: [], svgWidth: 0, svgHeight: 0 };

    const itemMap = {};
    for (const item of workItems) itemMap[item.id] = item;
    const ids = new Set(workItems.map(i => i.id));

    // Build adjacency from dependencies
    const outEdges = {};
    const inCount = {};
    const edgeList = [];
    for (const id of ids) { outEdges[id] = []; inCount[id] = 0; }

    for (const dep of (dependencies || [])) {
      const from = dep.depends_on_id || dep.depends_on || dep.dependency_id || dep.target_id;
      const to = dep.issue_id;
      if (from && to && ids.has(from) && ids.has(to) && from !== to) {
        outEdges[from].push(to);
        inCount[to]++;
        edgeList.push({ from, to });
      }
    }

    // Check if there are actual dependency edges
    const hasDeps = edgeList.length > 0;

    // Assign levels via topological sort (BFS)
    const level = {};

    if (hasDeps) {
      const q = [];
      for (const id of ids) {
        if (inCount[id] === 0) { q.push(id); level[id] = 0; }
      }
      let qi = 0;
      while (qi < q.length) {
        const n = q[qi++];
        for (const next of outEdges[n]) {
          inCount[next]--;
          level[next] = Math.max(level[next] || 0, level[n] + 1);
          if (inCount[next] === 0) q.push(next);
        }
      }
      // Cycles get level 0
      for (const id of ids) { if (level[id] === undefined) level[id] = 0; }
    } else {
      // No deps: group by status as pseudo-pipeline
      const statusCol = { 'open': 0, 'in-progress': 1, 'blocked': 2, 'closed': 3, 'done': 3 };
      for (const id of ids) {
        const s = normStatus(itemMap[id]?.status);
        level[id] = statusCol[s] !== undefined ? statusCol[s] : 0;
      }
    }

    // Group by level
    const maxLevel = Math.max(0, ...Object.values(level));
    const groups = [];
    for (let i = 0; i <= maxLevel; i++) groups.push([]);
    for (const id of ids) groups[level[id]].push(id);

    // Sort within levels: active first, then open, blocked, closed
    const ord = { 'in-progress': 0, 'open': 1, 'blocked': 2, 'closed': 3, 'done': 3 };
    for (const g of groups) {
      g.sort((a, b) => {
        const sa = normStatus(itemMap[a]?.status);
        const sb = normStatus(itemMap[b]?.status);
        return (ord[sa] ?? 1) - (ord[sb] ?? 1);
      });
    }

    // Position nodes
    const pos = {};
    let maxRow = 0;
    for (let col = 0; col <= maxLevel; col++) {
      for (let row = 0; row < groups[col].length; row++) {
        pos[groups[col][row]] = { x: PAD + col * COL_GAP, y: PAD + row * ROW_GAP };
        maxRow = Math.max(maxRow, row);
      }
    }

    // Build hooked agent set for highlighting
    const hookedBeads = new Set();
    for (const a of (agents || [])) {
      if (a.hook_bead) hookedBeads.add(a.hook_bead);
    }

    const graphNodes = [...ids].map(id => ({
      id,
      item: itemMap[id],
      x: pos[id].x,
      y: pos[id].y,
      hooked: hookedBeads.has(id),
    }));

    return {
      nodes: graphNodes,
      edges: edgeList,
      svgWidth: Math.max(PAD * 2 + maxLevel * COL_GAP + NODE_R * 2, 200),
      svgHeight: Math.max(PAD * 2 + maxRow * ROW_GAP + NODE_R * 2, 80),
    };
  }, [issues, dependencies, agents]);

  if (!nodes.length) {
    return (
      <div className="convoy-graph">
        <div className="work-section-header">Dependency Graph</div>
        <div className="empty">No work items to graph</div>
      </div>
    );
  }

  // Build a lookup for node positions
  const posMap = {};
  for (const n of nodes) posMap[n.id] = n;

  const expandedNode = expandedId ? posMap[expandedId] : null;

  return (
    <div className="convoy-graph">
      <div className="work-section-header">
        Dependency Graph
        <span className="badge badge-convoy">{nodes.length}</span>
      </div>
      <div className="convoy-graph__viewport">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="convoy-graph__svg"
        >
          <defs>
            <marker
              id="dep-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,2 L10,5 L0,8" fill="var(--text-dim)" opacity="0.6" />
            </marker>
            {nodes.map(n => (
              <filter key={`glow-${n.id}`} id={`glow-${n.id}`}>
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={statusGlow(n.item?.status)} />
              </filter>
            ))}
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = posMap[e.from];
            const to = posMap[e.to];
            if (!from || !to) return null;
            return (
              <path
                key={`edge-${i}`}
                d={bezierPath(from.x + NODE_R, from.y, to.x - NODE_R, to.y)}
                fill="none"
                stroke="var(--border-accent)"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                markerEnd="url(#dep-arrow)"
                className="convoy-graph__edge"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const s = normStatus(n.item?.status);
            const isExpanded = expandedId === n.id;
            return (
              <g
                key={n.id}
                className={`convoy-graph__node ${isExpanded ? 'convoy-graph__node--expanded' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : n.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse ring for hooked items */}
                {n.hooked && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={NODE_R + 4}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    className="convoy-graph__pulse"
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={NODE_R}
                  fill={statusColor(n.item?.status)}
                  stroke={isExpanded ? 'var(--text-bright)' : 'var(--border)'}
                  strokeWidth={isExpanded ? 2 : 1}
                  filter={`url(#glow-${n.id})`}
                />
                {/* Status icon inside circle */}
                <text
                  x={n.x}
                  y={n.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="var(--bg)"
                  fontWeight="700"
                  pointerEvents="none"
                >
                  {s === 'closed' || s === 'done' ? '\u2713' : s === 'in-progress' ? '\u25B6' : s === 'blocked' ? '\u2716' : '\u25CB'}
                </text>
                {/* Label */}
                <text
                  x={n.x}
                  y={n.y + NODE_R + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-dim)"
                  className="convoy-graph__label"
                >
                  {truncate(n.id, LABEL_MAX)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Expanded detail panel */}
      {expandedNode && expandedNode.item && (
        <div className="convoy-graph__detail">
          <div className="convoy-graph__detail-header">
            <span
              className="convoy-graph__detail-id cross-link cross-link--issue"
              onClick={() => onDrillIssue?.(expandedNode.id)}
            >
              {expandedNode.id}
            </span>
            <span
              className="convoy-graph__detail-status"
              style={{ color: statusColor(expandedNode.item.status) }}
            >
              {normStatus(expandedNode.item.status)}
            </span>
            <button className="convoy-graph__detail-close" onClick={() => setExpandedId(null)}>{'\u2715'}</button>
          </div>
          <div className="convoy-graph__detail-title">
            {expandedNode.item.title || expandedNode.id}
          </div>
          <div className="convoy-graph__detail-meta">
            {expandedNode.item.assignee && (
              <span className="convoy-graph__detail-tag">
                assignee: {expandedNode.item.assignee}
              </span>
            )}
            {expandedNode.item.rig && (
              <span className="convoy-graph__detail-tag">
                rig: {expandedNode.item.rig}
              </span>
            )}
            {expandedNode.item.issue_type && (
              <span className="convoy-graph__detail-tag">
                type: {expandedNode.item.issue_type}
              </span>
            )}
            {expandedNode.item.priority != null && (
              <span className="convoy-graph__detail-tag">
                P{expandedNode.item.priority}
              </span>
            )}
            {expandedNode.hooked && (
              <span className="convoy-graph__detail-tag convoy-graph__detail-tag--hooked">
                hooked
              </span>
            )}
          </div>
          {/* Show dependency links */}
          {edges.filter(e => e.from === expandedNode.id || e.to === expandedNode.id).length > 0 && (
            <div className="convoy-graph__detail-deps">
              {edges.filter(e => e.to === expandedNode.id).map((e, i) => (
                <span key={`b-${i}`} className="convoy-graph__dep-link convoy-graph__dep-link--blocker">
                  blocked by{' '}
                  <span
                    className="cross-link cross-link--issue"
                    onClick={() => { setExpandedId(e.from); }}
                  >{e.from}</span>
                </span>
              ))}
              {edges.filter(e => e.from === expandedNode.id).map((e, i) => (
                <span key={`d-${i}`} className="convoy-graph__dep-link convoy-graph__dep-link--blocks">
                  blocks{' '}
                  <span
                    className="cross-link cross-link--issue"
                    onClick={() => { setExpandedId(e.to); }}
                  >{e.to}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
