import React from 'react';
import './MayorAvatar.css';

export default function MayorAvatar({ speaking = false }) {
  return (
    <div className={`mayor-avatar${speaking ? ' mayor-avatar--speaking' : ''}`}>
      <svg
        viewBox="0 0 200 260"
        width="200"
        height="260"
        className="mayor-avatar__figure"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Speaking aura */}
        <ellipse
          cx="100"
          cy="180"
          rx="90"
          ry="70"
          fill="#c17f24"
          className="mayor-avatar__aura"
        />

        {/* === TOP HAT === */}
        {/* Hat brim */}
        <ellipse cx="100" cy="68" rx="44" ry="8" fill="#2a2218" stroke="#c17f24" strokeWidth="1" />
        {/* Hat body */}
        <rect x="72" y="18" width="56" height="52" rx="4" fill="#2a2218" stroke="#c17f24" strokeWidth="1" />
        {/* Hat band */}
        <rect x="72" y="55" width="56" height="10" rx="2" fill="#c17f24" opacity="0.6" />
        {/* Hat band buckle */}
        <rect x="94" y="56" width="12" height="8" rx="1" fill="none" stroke="#d4c4a0" strokeWidth="1.2" />

        {/* === HEAD === */}
        {/* Face */}
        <ellipse cx="100" cy="100" rx="36" ry="34" fill="#d4a06a" />
        {/* Ruddy cheeks */}
        <ellipse cx="76" cy="106" rx="8" ry="5" fill="#c47a5a" opacity="0.4" />
        <ellipse cx="124" cy="106" rx="8" ry="5" fill="#c47a5a" opacity="0.4" />

        {/* === EYES === */}
        {/* Left eye */}
        <ellipse cx="86" cy="94" rx="5" ry="4.5" fill="#1a1410" />
        <ellipse cx="87" cy="93" rx="2" ry="1.8" fill="#d4c4a0" opacity="0.6" />
        {/* Right eye (behind monocle) */}
        <ellipse cx="114" cy="94" rx="5" ry="4.5" fill="#1a1410" />
        <ellipse cx="115" cy="93" rx="2" ry="1.8" fill="#d4c4a0" opacity="0.6" />

        {/* Bushy eyebrows */}
        <path d="M78,86 Q86,81 94,86" fill="none" stroke="#3a2a18" strokeWidth="3" strokeLinecap="round" />
        <path d="M106,86 Q114,81 122,86" fill="none" stroke="#3a2a18" strokeWidth="3" strokeLinecap="round" />

        {/* === MONOCLE === */}
        <circle cx="114" cy="94" r="12" fill="none" stroke="#c17f24" strokeWidth="1.8" />
        {/* Monocle glass */}
        <circle cx="114" cy="94" r="10" fill="rgba(193,127,36,0.06)" />
        {/* Monocle glint */}
        <path
          d="M108,88 Q112,86 116,88"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="mayor-avatar__glint"
        />
        {/* Monocle chain */}
        <path
          d="M103,98 Q98,115 94,128"
          fill="none"
          stroke="#c17f24"
          strokeWidth="0.8"
          opacity="0.5"
          className="mayor-avatar__chain"
        />

        {/* === NOSE === */}
        <ellipse cx="100" cy="105" rx="6" ry="5" fill="#c98a5a" />
        <ellipse cx="102" cy="103" rx="2" ry="1.5" fill="#d4a06a" opacity="0.5" />

        {/* === MUSTACHE === */}
        <path
          d="M82,114 Q88,118 100,115 Q112,118 118,114 Q116,120 108,118 Q100,122 92,118 Q84,120 82,114Z"
          fill="#3a2a18"
        />

        {/* === MOUTH (small smirk under mustache) === */}
        <path
          d="M92,121 Q100,126 108,121"
          fill="none"
          stroke="#8a5a3a"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* === DOUBLE CHIN === */}
        <path
          d="M72,120 Q74,138 100,140 Q126,138 128,120"
          fill="#cda06a"
          opacity="0.5"
        />

        {/* === BODY (rotund) === */}
        {/* Vest/jacket */}
        <ellipse cx="100" cy="200" rx="60" ry="52" fill="#2a2218" stroke="#c17f24" strokeWidth="1" />
        {/* Vest front opening */}
        <path d="M100,150 L96,250" fill="none" stroke="#c17f24" strokeWidth="0.8" opacity="0.4" />
        <path d="M100,150 L104,250" fill="none" stroke="#c17f24" strokeWidth="0.8" opacity="0.4" />
        {/* Shirt/belly peek */}
        <path d="M96,155 Q100,200 96,250 L104,250 Q100,200 104,155 Z" fill="#d4c4a0" opacity="0.15" />
        {/* Vest buttons */}
        <circle cx="100" cy="170" r="2.5" fill="#c17f24" opacity="0.7" />
        <circle cx="100" cy="186" r="2.5" fill="#c17f24" opacity="0.7" />
        <circle cx="100" cy="202" r="2.5" fill="#c17f24" opacity="0.7" />
        {/* Watch chain across belly */}
        <path
          d="M82,178 Q90,184 100,182 Q110,180 118,178"
          fill="none"
          stroke="#c17f24"
          strokeWidth="1"
          opacity="0.5"
        />
        <circle cx="118" cy="178" r="3" fill="none" stroke="#c17f24" strokeWidth="1" opacity="0.5" />

        {/* Collar */}
        <path d="M72,148 Q86,156 100,150 Q114,156 128,148" fill="none" stroke="#d4c4a0" strokeWidth="1.5" />

        {/* Bow tie */}
        <polygon points="90,150 100,146 100,154" fill="#b5442e" />
        <polygon points="110,150 100,146 100,154" fill="#b5442e" />
        <circle cx="100" cy="150" r="2.5" fill="#c17f24" />

        {/* === CIGAR === */}
        <g>
          {/* Cigar body */}
          <rect x="128" y="112" width="32" height="6" rx="3" fill="#8a6a3a" transform="rotate(-15, 128, 115)" />
          {/* Cigar band */}
          <rect x="136" y="112" width="8" height="6" rx="1" fill="#c17f24" opacity="0.6" transform="rotate(-15, 128, 115)" />
          {/* Cigar lit tip */}
          <circle
            cx="159"
            cy="104"
            r="3.5"
            fill="#e85a20"
            className="mayor-avatar__cigar-tip"
          />
          <circle cx="159" cy="104" r="2" fill="#ffaa44" opacity="0.6" className="mayor-avatar__cigar-tip" />
        </g>

        {/* === SMOKE PARTICLES === */}
        <g className="mayor-avatar__smoke">
          <circle cx="160" cy="100" r="3" fill="#d4c4a0" opacity="0.25" className="mayor-avatar__smoke-particle" />
          <circle cx="157" cy="96" r="4" fill="#d4c4a0" opacity="0.2" className="mayor-avatar__smoke-particle" />
          <circle cx="162" cy="92" r="3.5" fill="#d4c4a0" opacity="0.18" className="mayor-avatar__smoke-particle" />
          <circle cx="155" cy="88" r="4.5" fill="#d4c4a0" opacity="0.15" className="mayor-avatar__smoke-particle" />
        </g>

        {/* === EARS === */}
        <ellipse cx="64" cy="100" rx="6" ry="8" fill="#c98a5a" />
        <ellipse cx="136" cy="100" rx="6" ry="8" fill="#c98a5a" />
      </svg>
    </div>
  );
}
