import React from 'react';

const ISSUE_RE = /\b(gs-[a-z0-9]{3,12})\b/g;
const AGENT_RE = /\b(gastown\/[a-z][\w-]*(?:\/[a-z][\w-]*)?|slop\/[a-z][\w-]*(?:\/[a-z][\w-]*)?)\b/g;

export default function LinkedText({ text, onClickIssue, onClickAgent }) {
  if (!text) return null;

  // Build a combined regex that matches either pattern
  const combined = new RegExp(`(gs-[a-z0-9]{3,12})|((?:gastown|slop)\\/[a-z][\\w-]*(?:\\/[a-z][\\w-]*)?)`, 'g');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      parts.push({ type: 'issue', value: match[1] });
    } else if (match[2]) {
      parts.push({ type: 'agent', value: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'issue') {
          return (
            <span
              key={i}
              className="cross-link cross-link--issue"
              onClick={e => { e.stopPropagation(); onClickIssue?.(p.value); }}
            >
              {p.value}
            </span>
          );
        }
        if (p.type === 'agent') {
          return (
            <span
              key={i}
              className="cross-link cross-link--agent"
              onClick={e => { e.stopPropagation(); onClickAgent?.(p.value); }}
            >
              {p.value}
            </span>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}
