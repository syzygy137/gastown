import React from 'react';

const classMap = {
  open: 'badge-open',
  'in-progress': 'badge-in-progress',
  'in_progress': 'badge-in-progress',
  active: 'badge-active',
  blocked: 'badge-blocked',
  closed: 'badge-closed',
  done: 'badge-done',
  idle: 'badge-idle',
  molecule: 'badge-molecule',
  message: 'badge-message',
  task: 'badge-task',
  convoy: 'badge-convoy',
};

export default function StatusBadge({ value }) {
  if (!value) return null;
  const cls = classMap[value.toLowerCase()] || 'badge-idle';
  return <span className={`badge ${cls}`}>{value}</span>;
}
