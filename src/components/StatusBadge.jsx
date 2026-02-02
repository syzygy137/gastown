import React from 'react';

const classMap = {
  open: 'badge-open',
  'in-progress': 'badge-in-progress',
  'in_progress': 'badge-in-progress',
  active: 'badge-active',
  working: 'badge-active',
  blocked: 'badge-blocked',
  offline: 'badge-blocked',
  closed: 'badge-closed',
  done: 'badge-done',
  idle: 'badge-idle',
  spawning: 'badge-in-progress',
  molecule: 'badge-molecule',
  message: 'badge-message',
  task: 'badge-task',
  convoy: 'badge-convoy',
  hooked: 'badge-in-progress',
};

export default function StatusBadge({ value }) {
  if (!value) return null;
  const cls = classMap[value.toLowerCase()] || 'badge-idle';
  return <span className={`badge ${cls}`}>{value}</span>;
}
