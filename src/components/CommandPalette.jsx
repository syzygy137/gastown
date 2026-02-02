import React, { useState, useEffect, useRef, useMemo } from 'react';

function fuzzyMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return { match: true, score: t.indexOf(q) === 0 ? 2 : 1 };
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? { match: true, score: 0 } : { match: false, score: -1 };
}

const TAB_ITEMS = [
  { id: 'tab-sessions', type: 'tab', name: 'Sessions', description: 'Tmux session viewer', icon: '\u2395', shortcut: '1', tabId: 'sessions' },
  { id: 'tab-issues', type: 'tab', name: 'Issues', description: 'Issue board (kanban)', icon: '\u2691', shortcut: '2', tabId: 'issues' },
  { id: 'tab-merge-queue', type: 'tab', name: 'Merge Queue', description: 'MR status, refinery progress & merge history', icon: '\u2A4E', shortcut: '3', tabId: 'merge-queue' },
  { id: 'tab-mail', type: 'tab', name: 'Mail', description: 'Agent messaging feed', icon: '\u2709', shortcut: '4', tabId: 'mail' },
  { id: 'tab-events', type: 'tab', name: 'Events', description: 'Event timeline', icon: '\u25C9', shortcut: '5', tabId: 'events' },
  { id: 'tab-formulas', type: 'tab', name: 'Formulas', description: 'Formula browser', icon: '\u2697', shortcut: '6', tabId: 'formulas' },
  { id: 'tab-controls', type: 'tab', name: 'Controls', description: 'Command & control panel', icon: '\u2699', shortcut: '7', tabId: 'controls' },
];

const COMMAND_ITEMS = [
  { id: 'cmd-refresh', type: 'command', name: 'Refresh data', description: 'Reload all data', icon: '\u21BB', shortcut: 'R' },
  { id: 'cmd-mail', type: 'command', name: 'Check mail', description: 'gt mail inbox', icon: '\u2709', command: 'gt mail inbox' },
  { id: 'cmd-ready', type: 'command', name: 'Ready issues', description: 'gt ready', icon: '\u2691', command: 'gt ready' },
  { id: 'cmd-trail', type: 'command', name: 'Agent trail', description: 'gt trail', icon: '\u25B6', command: 'gt trail' },
  { id: 'cmd-sessions', type: 'command', name: 'List sessions', description: 'gt session list', icon: '\u2395', command: 'gt session list' },
];

export default function CommandPalette({ open, onClose, agents, issues, onSwitchTab, onSelectAgent, onRunCommand }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const agentItems = useMemo(() =>
    (agents || []).map(a => {
      const parts = (a.title || '').split('/');
      const shortName = parts[parts.length - 1] || a.title;
      return {
        id: `agent-${a.id}`,
        type: 'agent',
        name: shortName,
        description: `${a.title} \u2014 ${a.state || 'unknown'}`,
        icon: '\u2660',
        agent: a,
      };
    }),
    [agents]
  );

  const issueItems = useMemo(() =>
    (issues || []).map(i => ({
      id: `issue-${i.id}`,
      type: 'issue',
      name: `${i.id}: ${i.title}`,
      description: `${i.status || 'open'} \u2014 ${i.assignee || 'unassigned'}`,
      icon: '\u25A0',
      issue: i,
    })),
    [issues]
  );

  const results = useMemo(() => {
    const all = [...TAB_ITEMS, ...COMMAND_ITEMS, ...agentItems, ...issueItems];
    if (!query.trim()) return TAB_ITEMS.concat(COMMAND_ITEMS.slice(0, 3));

    return all
      .map(item => {
        const nameMatch = fuzzyMatch(query, item.name);
        const descMatch = fuzzyMatch(query, item.description || '');
        const best = nameMatch.score >= descMatch.score ? nameMatch : descMatch;
        return { ...item, _match: best };
      })
      .filter(item => item._match.match)
      .sort((a, b) => b._match.score - a._match.score)
      .slice(0, 12);
  }, [query, agentItems, issueItems]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length, query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIdx];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  function handleSelect(item) {
    if (!item) return;
    switch (item.type) {
      case 'tab':
        onSwitchTab?.(item.tabId);
        break;
      case 'agent':
        onSelectAgent?.(item.agent);
        break;
      case 'issue':
        onSwitchTab?.('issues');
        break;
      case 'command':
        if (item.id === 'cmd-refresh') {
          window.location.reload();
        } else if (item.command) {
          onRunCommand?.(item.command);
        }
        break;
    }
    onClose?.();
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(results[selectedIdx]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }

  if (!open) return null;

  const typeLabel = { tab: 'Tab', agent: 'Agent', issue: 'Issue', command: 'Command' };

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="cmd-palette-input-wrap">
          <span className="cmd-palette-icon">{'\u2318'}</span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Search tabs, agents, commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="cmd-palette-esc">ESC</kbd>
        </div>
        <div className="cmd-palette-results" ref={listRef}>
          {results.length === 0 && (
            <div className="cmd-palette-empty">No results found</div>
          )}
          {results.map((item, idx) => (
            <div
              key={item.id}
              className={`cmd-palette-item ${idx === selectedIdx ? 'cmd-palette-item--active' : ''}`}
              onMouseEnter={() => setSelectedIdx(idx)}
              onClick={() => handleSelect(item)}
            >
              <span className="cmd-palette-item-icon">{item.icon}</span>
              <div className="cmd-palette-item-text">
                <span className="cmd-palette-item-name">{item.name}</span>
                <span className="cmd-palette-item-desc">{item.description}</span>
              </div>
              <div className="cmd-palette-item-meta">
                <span className="cmd-palette-item-type">{typeLabel[item.type]}</span>
                {item.shortcut && (
                  <kbd className="cmd-palette-kbd">{item.shortcut}</kbd>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="cmd-palette-footer">
          <span><kbd className="cmd-palette-kbd">{'\u2191\u2193'}</kbd> Navigate</span>
          <span><kbd className="cmd-palette-kbd">{'\u23CE'}</kbd> Select</span>
          <span><kbd className="cmd-palette-kbd">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
