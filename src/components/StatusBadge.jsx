import React from 'react';
import Tooltip from './Tooltip.jsx';

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

const STATUS_DESCRIPTIONS = {
  open: 'Open: ready to be picked up or worked on',
  'in-progress': 'In Progress: actively being worked on by an agent',
  'in_progress': 'In Progress: actively being worked on by an agent',
  active: 'Active: agent is running and processing',
  blocked: 'Blocked: waiting on a dependency or external input',
  closed: 'Closed: completed and resolved',
  done: 'Done: work finished successfully',
  idle: 'Idle: agent is alive but not currently working',
  molecule: 'Molecule: a work unit or formula component',
  message: 'Message: inter-agent communication',
  task: 'Task: a work item assigned to an agent',
  convoy: 'Convoy: a group of related work items',
  hooked: 'Hooked: agent has claimed this work via hook',
  mayor: 'Mayor: top-level orchestrator agent',
  deacon: 'Deacon: mid-level coordinator agent',
  witness: 'Witness: monitoring and observation agent',
  refinery: 'Refinery: code processing and build agent',
  polecat: 'Polecat: autonomous worker agent',
  boot: 'Boot: initialization and setup agent',
  'merge-request': 'Merge Request: a PR/code review waiting for merge',
  epic: 'Epic: a high-level work grouping',
};

export default function StatusBadge({ value }) {
  if (!value) return null;
  const cls = classMap[value.toLowerCase()] || 'badge-idle';
  const description = STATUS_DESCRIPTIONS[value.toLowerCase()] || null;
  const badge = <span className={`badge ${cls}`}>{value}</span>;

  if (description) {
    return <Tooltip content={description}>{badge}</Tooltip>;
  }
  return badge;
}
