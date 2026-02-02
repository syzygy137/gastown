import React from 'react';

const ROLE_CONFIGS = {
  mayor: {
    color: '#c17f24',
    bgColor: 'rgba(193,127,36,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <polygon points="6,18 10,10 13,15 16,8 19,15 22,10 26,18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="6" y="18" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" className="avatar-gem" />
        <circle cx="16" cy="8" r="2" fill="currentColor" className="avatar-gem avatar-gem--center" />
        <circle cx="22" cy="10" r="1.5" fill="currentColor" className="avatar-gem" />
        {active && <circle cx="16" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" className="avatar-pulse-ring" />}
      </svg>
    ),
  },
  deacon: {
    color: '#c17f24',
    bgColor: 'rgba(193,127,36,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <ellipse cx="16" cy="16" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="3.5" fill="currentColor" opacity="0.3" />
        <circle cx="16" cy="16" r="2" fill="currentColor" className={active ? 'avatar-eye-scan' : ''} />
        {active && <ellipse cx="16" cy="16" rx="12" ry="7" fill="none" stroke="currentColor" strokeWidth="0.5" className="avatar-pulse-ring" />}
      </svg>
    ),
  },
  witness: {
    color: '#4d9e8a',
    bgColor: 'rgba(77,158,138,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.4" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" className={active ? 'avatar-radar-ring' : ''} />
        <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.3" className={active ? 'avatar-radar-ring avatar-radar-ring--outer' : ''} />
        <line x1="16" y1="16" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" className={active ? 'avatar-radar-sweep' : ''} />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  refinery: {
    color: '#cc6a2e',
    bgColor: 'rgba(204,106,46,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <rect x="8" y="18" width="16" height="6" rx="1" fill="currentColor" opacity="0.3" />
        <rect x="10" y="14" width="12" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13,14 Q13,10 14,8 Q14,11 16,9 Q16,11 18,8 Q19,10 19,14" fill="none" stroke="currentColor" strokeWidth="1" className={active ? 'avatar-flame' : ''} opacity={active ? 1 : 0.4} />
        {active && (
          <>
            <circle cx="14" cy="11" r="1" fill="currentColor" className="avatar-spark" />
            <circle cx="18" cy="10" r="0.8" fill="currentColor" className="avatar-spark avatar-spark--delay" />
          </>
        )}
      </svg>
    ),
  },
  polecat: {
    color: '#b5442e',
    bgColor: 'rgba(181,68,46,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <rect
            key={angle}
            x="15" y="7"
            width="2" height="4"
            rx="0.5"
            fill="currentColor"
            opacity="0.6"
            transform={`rotate(${angle}, 16, 16)`}
          />
        ))}
        <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.3" className={active ? 'avatar-cog-spin' : ''} />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  boot: {
    color: '#8a7d65',
    bgColor: 'rgba(138,125,101,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <polygon points="18,6 12,17 17,17 14,26 22,15 17,15 20,6" fill="currentColor" opacity={active ? 0.8 : 0.4} className={active ? 'avatar-bolt-flash' : ''} />
        <polygon points="18,6 12,17 17,17 14,26 22,15 17,15 20,6" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  hq: {
    color: '#c17f24',
    bgColor: 'rgba(193,127,36,0.15)',
    icon: (active) => (
      <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
        <polygon points="16,6 18.5,12.5 25,13 20,18 21.5,25 16,21.5 10.5,25 12,18 7,13 13.5,12.5" fill="currentColor" opacity={active ? 0.5 : 0.3} />
        <polygon points="16,6 18.5,12.5 25,13 20,18 21.5,25 16,21.5 10.5,25 12,18 7,13 13.5,12.5" fill="none" stroke="currentColor" strokeWidth="1" />
        {active && <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" className="avatar-pulse-ring" />}
      </svg>
    ),
  },
};

const DEFAULT_CONFIG = {
  color: '#8a7d65',
  bgColor: 'rgba(138,125,101,0.15)',
  icon: (active) => (
    <svg viewBox="0 0 32 32" className={`avatar-svg ${active ? 'avatar-svg--active' : ''}`}>
      <circle cx="16" cy="16" r="8" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  ),
};

export default function AgentAvatar({ role, active = false, size = 28 }) {
  const config = ROLE_CONFIGS[role?.toLowerCase()] || DEFAULT_CONFIG;

  return (
    <div
      className={`agent-avatar ${active ? 'agent-avatar--active' : ''}`}
      style={{
        width: size,
        height: size,
        color: config.color,
        background: config.bgColor,
      }}
    >
      {config.icon(active)}
    </div>
  );
}
