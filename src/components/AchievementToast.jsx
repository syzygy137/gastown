import React, { useState, useEffect, useCallback, useRef } from 'react';

const ACHIEVEMENTS = {
  first_blood: {
    icon: '\u2694',
    title: 'First Blood',
    desc: 'First work item completed',
    check: (prev, curr) => {
      const prevDone = prev.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      const currDone = curr.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      return prevDone === 0 && currDone > 0;
    },
  },
  five_down: {
    icon: '\u2605',
    title: 'Quintet',
    desc: '5 work items completed',
    check: (prev, curr) => {
      const prevDone = prev.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      const currDone = curr.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      return prevDone < 5 && currDone >= 5;
    },
  },
  ten_down: {
    icon: '\u2B50',
    title: 'Decimator',
    desc: '10 work items completed',
    check: (prev, curr) => {
      const prevDone = prev.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      const currDone = curr.issues.filter(i => i.status === 'closed' || i.status === 'done').length;
      return prevDone < 10 && currDone >= 10;
    },
  },
  full_squad: {
    icon: '\u26A1',
    title: 'Full Squad',
    desc: 'All agents active at once',
    check: (prev, curr) => {
      if (curr.agents.length < 2) return false;
      const prevAllActive = prev.agents.length > 0 && prev.agents.every(a => a.status === 'open');
      const currAllActive = curr.agents.every(a => a.status === 'open');
      return !prevAllActive && currAllActive;
    },
  },
  convoy_launch: {
    icon: '\uD83D\uDE80',
    title: 'Convoy Launched',
    desc: 'An agent hooked to a work item',
    check: (prev, curr) => {
      const prevHooked = prev.agents.filter(a => a.hook_bead).length;
      const currHooked = curr.agents.filter(a => a.hook_bead).length;
      return currHooked > prevHooked;
    },
  },
  mail_surge: {
    icon: '\u2709',
    title: 'Mail Surge',
    desc: '5+ new messages received',
    check: (prev, curr) => {
      return curr.mail.length >= prev.mail.length + 5;
    },
  },
  clean_sweep: {
    icon: '\u2728',
    title: 'Clean Sweep',
    desc: 'All work items completed!',
    check: (prev, curr) => {
      const workItems = curr.issues.filter(i => i.issue_type !== 'agent' && i.issue_type !== 'message');
      if (workItems.length === 0) return false;
      const allDone = workItems.every(i => i.status === 'closed' || i.status === 'done');
      const prevWork = prev.issues.filter(i => i.issue_type !== 'agent' && i.issue_type !== 'message');
      const prevAllDone = prevWork.length > 0 && prevWork.every(i => i.status === 'closed' || i.status === 'done');
      return allDone && !prevAllDone;
    },
  },
  blocker_cleared: {
    icon: '\uD83D\uDEE1',
    title: 'Blocker Cleared',
    desc: 'A blocked item was unblocked',
    check: (prev, curr) => {
      const prevBlocked = prev.issues.filter(i => i.status === 'blocked').map(i => i.id);
      if (prevBlocked.length === 0) return false;
      const currBlocked = new Set(curr.issues.filter(i => i.status === 'blocked').map(i => i.id));
      return prevBlocked.some(id => !currBlocked.has(id));
    },
  },
};

export function useAchievements() {
  const [toasts, setToasts] = useState([]);
  const prevStateRef = useRef(null);
  const earnedRef = useRef(new Set());
  const idCounter = useRef(0);

  const checkAchievements = useCallback((state) => {
    const prev = prevStateRef.current;
    prevStateRef.current = {
      issues: [...state.issues],
      agents: [...state.agents],
      mail: [...state.mail],
    };

    if (!prev) return;

    const newToasts = [];
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (earnedRef.current.has(id)) continue;
      try {
        if (achievement.check(prev, state)) {
          earnedRef.current.add(id);
          newToasts.push({
            id: `toast-${++idCounter.current}`,
            ...achievement,
          });
        }
      } catch { /* ignore check failures */ }
    }

    if (newToasts.length > 0) {
      setToasts(prev => [...prev, ...newToasts]);
    }
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  return { toasts, checkAchievements, dismissToast };
}

export default function AchievementToast({ toasts, onDismiss }) {
  return (
    <div className="achievement-toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 4500);
    const removeTimer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`achievement-toast ${exiting ? 'achievement-toast--exit' : ''}`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className="achievement-toast__sparkle" />
      <div className="achievement-toast__icon">{toast.icon}</div>
      <div className="achievement-toast__body">
        <div className="achievement-toast__label">Achievement Unlocked!</div>
        <div className="achievement-toast__title">{toast.title}</div>
        <div className="achievement-toast__desc">{toast.desc}</div>
      </div>
    </div>
  );
}
