import React from 'react';

interface CTDILogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const CTDILogo: React.FC<CTDILogoProps> = ({
  className = '',
  width = '100%',
  height = 'auto'
}) => {
  return (
    <svg
      viewBox="10 8 400 108"
      width={width}
      height={height}
      className={`select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Drop shadow for 3D diamonds */}
        <filter id="ctdi-shadow" x="-20%" y="-20%" width="140%" height="150%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#001838" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000d20" floodOpacity="0.9" />
        </filter>

        {/* Chrome / Metallic Face Gradient */}
        <linearGradient id="chrome-face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#d9e2ec" />
          <stop offset="45%" stopColor="#9fb3c8" />
          <stop offset="52%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#bcccdc" />
          <stop offset="100%" stopColor="#829ab1" />
        </linearGradient>

        {/* Outer Silver Bevel Gradient (Top-Left Highlight) */}
        <linearGradient id="bevel-top-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Outer Silver Bevel Gradient (Bottom-Right Shadow) */}
        <linearGradient id="bevel-bottom-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Inner Diamond Sheen / Specular */}
        <linearGradient id="inner-sheen" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#627d98" stopOpacity="0.8" />
          <stop offset="35%" stopColor="#9fb3c8" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#d9e2ec" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#486581" stopOpacity="0.9" />
        </linearGradient>

        {/* Metallic Blue Letter Gradient */}
        <linearGradient id="blue-letter-grad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#0077c8" />
          <stop offset="25%" stopColor="#005ea2" />
          <stop offset="50%" stopColor="#003d73" />
          <stop offset="75%" stopColor="#005ea2" />
          <stop offset="100%" stopColor="#002b54" />
        </linearGradient>

        {/* Letter Bevel / Highlight */}
        <linearGradient id="letter-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Letter Inner Emboss Filter */}
        <filter id="letter-emboss" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1.5" stdDeviation="0.8" floodColor="#ffffff" floodOpacity="0.6" result="highlight" />
          <feDropShadow dx="-1" dy="-1.5" stdDeviation="0.8" floodColor="#001a35" floodOpacity="0.85" result="shadow" />
          <feBlend in="SourceGraphic" in2="highlight" mode="normal" />
        </filter>

        {/* Metallic Shine Stripe */}
        <linearGradient id="diag-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="58%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Render 4 Connected 3D Metallic Diamonds: C, T, D, I */}
      {/* Centers: Diamond 1 = 60, Diamond 2 = 160, Diamond 3 = 260, Diamond 4 = 360 */}
      {/* Size of diamond: half-width = 48, half-height = 48, offset 100px apart so they overlap/touch */}
      
      {[
        { cx: 62, letter: 'C', fontOffset: { x: -1, y: 0 } },
        { cx: 161, letter: 'T', fontOffset: { x: 0, y: 0 } },
        { cx: 260, letter: 'D', fontOffset: { x: 0, y: 0 } },
        { cx: 358, letter: 'I', fontOffset: { x: 0, y: 0 } },
      ].map((d, index) => {
        const cy = 60;
        const r = 46; // Outer radius
        const ir = 38; // Inner radius
        const top = `${d.cx},${cy - r}`;
        const right = `${d.cx + r},${cy}`;
        const bottom = `${d.cx},${cy + r}`;
        const left = `${d.cx - r},${cy}`;

        const iTop = `${d.cx},${cy - ir}`;
        const iRight = `${d.cx + ir},${cy}`;
        const iBottom = `${d.cx},${cy + ir}`;
        const iLeft = `${d.cx - ir},${cy}`;

        return (
          <g key={index} filter="url(#ctdi-shadow)">
            {/* 1. Outer Bevel Facet - Top-Left (Light) */}
            <polygon
              points={`${top} ${right} ${iRight} ${iTop} ${iLeft} ${left}`}
              fill="url(#bevel-top-left)"
            />

            {/* 2. Outer Bevel Facet - Bottom-Right (Dark) */}
            <polygon
              points={`${right} ${bottom} ${left} ${iLeft} ${iBottom} ${iRight}`}
              fill="url(#bevel-bottom-right)"
            />

            {/* 3. Outer Rim Ridge Outline */}
            <polygon
              points={`${top} ${right} ${bottom} ${left}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />

            {/* 4. Main Inner Chrome Diamond Plate */}
            <polygon
              points={`${iTop} ${iRight} ${iBottom} ${iLeft}`}
              fill="url(#chrome-face)"
            />

            {/* 5. Inner Reflective Sheen Layer */}
            <polygon
              points={`${iTop} ${iRight} ${iBottom} ${iLeft}`}
              fill="url(#inner-sheen)"
              style={{ mixBlendMode: 'overlay' }}
            />

            {/* 6. Dynamic Chrome Diagonal Highlight Flare */}
            <polygon
              points={`${iTop} ${iRight} ${iBottom} ${iLeft}`}
              fill="url(#diag-shine)"
            />

            {/* 7. Inner Bevel Border */}
            <polygon
              points={`${iTop} ${iRight} ${iBottom} ${iLeft}`}
              fill="none"
              stroke="#243b53"
              strokeWidth="1"
              strokeOpacity="0.5"
            />

            {/* 8. Top-Left Inner Edge Specular Gleam */}
            <line
              x1={d.cx - ir}
              y1={cy}
              x2={d.cx}
              y2={cy - ir}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.95"
            />
            <line
              x1={d.cx}
              y1={cy - ir}
              x2={d.cx + ir}
              y2={cy}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.75"
            />

            {/* 9. Bottom-Right Inner Edge Shade */}
            <line
              x1={d.cx - ir}
              y1={cy}
              x2={d.cx}
              y2={cy + ir}
              stroke="#102a43"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <line
              x1={d.cx}
              y1={cy + ir}
              x2={d.cx + ir}
              y2={cy}
              stroke="#102a43"
              strokeWidth="2"
              strokeOpacity="0.7"
            />

            {/* 10. Metallic Blue Embossed Letter (Italic Bold) */}
            {/* Drop shadow under the letter */}
            <text
              x={d.cx + d.fontOffset.x + 1}
              y={cy + 16 + d.fontOffset.y + 1.5}
              textAnchor="middle"
              fill="#001833"
              fillOpacity="0.65"
              fontSize="44"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="italic"
              letterSpacing="0.02em"
            >
              {d.letter}
            </text>

            {/* Top highlight for 3D text feel */}
            <text
              x={d.cx + d.fontOffset.x - 0.75}
              y={cy + 16 + d.fontOffset.y - 0.75}
              textAnchor="middle"
              fill="#e0f2fe"
              fontSize="44"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="italic"
              letterSpacing="0.02em"
            >
              {d.letter}
            </text>

            {/* Main Letter Body */}
            <text
              x={d.cx + d.fontOffset.x}
              y={cy + 16 + d.fontOffset.y}
              textAnchor="middle"
              fill="url(#blue-letter-grad)"
              fontSize="44"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="italic"
              letterSpacing="0.02em"
            >
              {d.letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
