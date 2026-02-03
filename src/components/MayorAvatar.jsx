import React from 'react';
import './MayorAvatar.css';

export default function MayorAvatar({ speaking = false }) {
  return (
    <div className={`mayor-avatar ${speaking ? 'mayor-avatar--speaking' : ''}`}>
      <div className="mayor-avatar__glow" />
      <div className="mayor-avatar__ring" />
      <svg
        viewBox="0 0 64 64"
        className="mayor-avatar__svg"
      >
        {/* Crown */}
        <polygon
          points="12,36 20,20 26,30 32,16 38,30 44,20 52,36"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          className="mayor-crown"
        />
        {/* Crown base */}
        <rect x="12" y="36" width="40" height="6" rx="2" fill="currentColor" opacity="0.25" />
        {/* Gems */}
        <circle cx="20" cy="20" r="2.5" fill="currentColor" className="mayor-gem" />
        <circle cx="32" cy="16" r="3.5" fill="currentColor" className="mayor-gem mayor-gem--center" />
        <circle cx="44" cy="20" r="2.5" fill="currentColor" className="mayor-gem" />
        {/* Speaking pulse rings */}
        {speaking && (
          <>
            <circle cx="32" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="0.8" className="mayor-pulse-ring" />
            <circle cx="32" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" className="mayor-pulse-ring mayor-pulse-ring--outer" />
          </>
        )}
        {/* Face plate */}
        <ellipse cx="32" cy="48" rx="14" ry="8" fill="currentColor" opacity="0.1" />
        <ellipse cx="32" cy="48" rx="14" ry="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        {/* Eyes */}
        <circle cx="26" cy="46" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="38" cy="46" r="1.5" fill="currentColor" opacity="0.6" />
        {/* Mouth — animated when speaking */}
        <ellipse
          cx="32"
          cy="52"
          rx="4"
          ry={speaking ? '2' : '0.8'}
          fill="currentColor"
          opacity="0.5"
          className={speaking ? 'mayor-mouth--speaking' : ''}
        />
      </svg>
      <div className="mayor-avatar__label">Mayor</div>
    </div>
  );
}
