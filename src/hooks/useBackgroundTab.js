import { useEffect, useRef, useCallback, useState } from 'react';

const BASE_TITLE = 'Gas Town Dashboard';

/**
 * Tracks tab visibility and accumulates change counts while tab is hidden.
 * On return: provides set of changed item IDs for flash highlighting.
 */
export default function useBackgroundTab(state) {
  const [isBackground, setIsBackground] = useState(false);
  const [changedIds, setChangedIds] = useState(new Set());
  const bgRef = useRef(false);
  const snapshotRef = useRef(null);
  const changeCountRef = useRef(0);
  const changedIdsRef = useRef(new Set());
  const canvasRef = useRef(null);
  const faviconRef = useRef(null);

  // Snapshot current state when going to background
  const takeSnapshot = useCallback((s) => ({
    agentStates: Object.fromEntries((s.agents || []).map(a => [a.id, a.agent_state || a.state || 'idle'])),
    mailIds: new Set((s.mail || []).map(m => m.id || `${m.from}-${m.timestamp}`)),
    issueStates: Object.fromEntries((s.issues || []).map(i => [i.id, i.status || 'open'])),
    agentCount: (s.agents || []).length,
    mailCount: (s.mail || []).length,
    issueCount: (s.issues || []).length,
  }), []);

  // Draw favicon badge with count
  const updateFavicon = useCallback((count) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 32;
    }
    if (!faviconRef.current) {
      faviconRef.current = document.querySelector('link[rel="icon"]');
      if (!faviconRef.current) {
        faviconRef.current = document.createElement('link');
        faviconRef.current.rel = 'icon';
        document.head.appendChild(faviconRef.current);
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);

    // Draw gear base icon
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c17f24';
    ctx.fillText('\u2699', 16, 17);

    if (count > 0) {
      // Badge circle
      const label = count > 99 ? '99+' : String(count);
      ctx.beginPath();
      ctx.arc(24, 8, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#b5442e';
      ctx.fill();
      ctx.strokeStyle = '#1a1410';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Badge text
      ctx.font = `bold ${label.length > 2 ? 8 : 10}px sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 24, 8);
    }

    faviconRef.current.href = canvas.toDataURL('image/png');
  }, []);

  // Update title with count
  const updateTitle = useCallback((count) => {
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
  }, []);

  // Diff current state against snapshot, accumulate changes
  const diffState = useCallback((current, snapshot) => {
    if (!snapshot) return;
    let newChanges = 0;
    const ids = changedIdsRef.current;

    // New or changed agents
    for (const agent of (current.agents || [])) {
      const prevState = snapshot.agentStates[agent.id];
      const curState = agent.agent_state || agent.state || 'idle';
      if (prevState === undefined || prevState !== curState) {
        ids.add(agent.id);
        newChanges++;
      }
    }

    // New mail
    for (const m of (current.mail || [])) {
      const mid = m.id || `${m.from}-${m.timestamp}`;
      if (!snapshot.mailIds.has(mid)) {
        ids.add(mid);
        newChanges++;
      }
    }

    // Changed issues
    for (const issue of (current.issues || [])) {
      const prevStatus = snapshot.issueStates[issue.id];
      const curStatus = issue.status || 'open';
      if (prevStatus === undefined || prevStatus !== curStatus) {
        ids.add(issue.id);
        newChanges++;
      }
    }

    if (newChanges > 0) {
      changeCountRef.current += newChanges;
      changedIdsRef.current = ids;
      // Update snapshot to current so we only count each change once
      snapshotRef.current = {
        agentStates: Object.fromEntries((current.agents || []).map(a => [a.id, a.agent_state || a.state || 'idle'])),
        mailIds: new Set((current.mail || []).map(m => m.id || `${m.from}-${m.timestamp}`)),
        issueStates: Object.fromEntries((current.issues || []).map(i => [i.id, i.status || 'open'])),
      };
    }
  }, []);

  // Visibility change handler
  useEffect(() => {
    function handleVisibility() {
      const hidden = document.hidden;

      if (hidden) {
        // Going to background: snapshot current state
        bgRef.current = true;
        setIsBackground(true);
        snapshotRef.current = takeSnapshot(state);
        changeCountRef.current = 0;
        changedIdsRef.current = new Set();
      } else {
        // Returning to foreground: expose changed IDs, clear badges
        bgRef.current = false;
        setIsBackground(false);
        setChangedIds(new Set(changedIdsRef.current));
        updateTitle(0);
        updateFavicon(0);

        // Auto-clear flash after animation duration
        setTimeout(() => setChangedIds(new Set()), 2000);
        snapshotRef.current = null;
        changeCountRef.current = 0;
        changedIdsRef.current = new Set();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state, takeSnapshot, updateTitle, updateFavicon]);

  // When state changes while in background, diff and update indicators
  useEffect(() => {
    if (!bgRef.current || !snapshotRef.current) return;
    diffState(state, snapshotRef.current);
    const count = changeCountRef.current;
    updateTitle(count);
    updateFavicon(count);
  }, [state, diffState, updateTitle, updateFavicon]);

  // Initialize favicon on mount (no badge)
  useEffect(() => {
    updateFavicon(0);
  }, [updateFavicon]);

  return { isBackground, changedIds };
}
