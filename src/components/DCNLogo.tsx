import React from 'react';
import { ZebraLogo } from './ZebraLogo';

interface DCNLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'horizontal' | 'banner' | 'with-zebra';
  textColor?: 'white' | 'dark';
  showZebra?: boolean;
}

export const DCNLogo: React.FC<DCNLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  textColor = 'white',
  showZebra = false
}) => {
  // Scaling dimensions
  const scale = {
    sm: { iconWidth: 36, iconHeight: 36, titleText: 'text-xs', subText: 'text-[7.5px]', gap: 'gap-2.5' },
    md: { iconWidth: 46, iconHeight: 46, titleText: 'text-[15px]', subText: 'text-[9px]', gap: 'gap-3' },
    lg: { iconWidth: 58, iconHeight: 58, titleText: 'text-lg', subText: 'text-[11px]', gap: 'gap-3.5' },
    xl: { iconWidth: 76, iconHeight: 76, titleText: 'text-2xl', subText: 'text-[13px]', gap: 'gap-4' }
  }[size];

  const renderContent = () => (
    <>
      {/* High-Fidelity Vector Emblem */}
      <svg
        width={scale.iconWidth}
        height={scale.iconHeight}
        viewBox="0 0 130 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_2px_10px_rgba(0,180,240,0.35)]"
      >
        <defs>
          {/* Orbital arc gradient */}
          <linearGradient id="orbitSwoop" x1="10%" y1="10%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="45%" stopColor="#00a3e0" />
            <stop offset="100%" stopColor="#005ea2" />
          </linearGradient>

          {/* Industrial Gear gradient */}
          <linearGradient id="gearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b4ec" />
            <stop offset="100%" stopColor="#005b99" />
          </linearGradient>

          {/* Badge verification gradient */}
          <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0099e6" />
            <stop offset="100%" stopColor="#004c8f" />
          </linearGradient>

          {/* Dog ear fold gradient */}
          <linearGradient id="foldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00c0f8" />
            <stop offset="100%" stopColor="#0077c8" />
          </linearGradient>

          {/* Soft document shadow */}
          <filter id="docShadow" x="-15%" y="-15%" width="130%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#001428" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* 1. Dynamic Outer Orbital Swoosh */}
        <path
          d="M 76 8 C 34 8 10 34 10 68 C 10 102 36 122 74 122 C 94 122 110 114 120 100 C 121 98.5 120 96.5 118 96.5 C 104 99 90 99 76 96 C 44 90 28 70 28 50 C 28 28 48 14 76 14 C 86 14 96 16.5 104 20 C 106 21 108 20 107 18 C 99 11 88 8 76 8 Z"
          fill="url(#orbitSwoop)"
        />

        {/* 2. White DCN Document Body */}
        <g filter="url(#docShadow)">
          {/* Main Paper Outline with Rounded Corners & Top-Right Dog-Ear Cutout */}
          <path
            d="M 42 24 C 37 24 34 27 34 32 L 34 94 C 34 99 37 102 42 102 L 90 102 C 95 102 98 99 98 94 L 98 44 L 78 24 Z"
            fill="#FFFFFF"
          />

          {/* Folded Corner (Dog-Ear) in Blue */}
          <path
            d="M 78 24 L 98 44 L 82 44 C 79.5 44 78 42.5 78 40 Z"
            fill="url(#foldGradient)"
          />
        </g>

        {/* 3. "DCN" Text on Document Header */}
        <text
          x="42"
          y="47"
          fill="#003566"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="18.5"
          letterSpacing="0.5"
        >
          DCN
        </text>

        {/* Document Content Lines */}
        <rect x="44" y="56" width="42" height="3.5" rx="1.75" fill="#cbd5e1" />
        <rect x="44" y="65" width="32" height="3.5" rx="1.75" fill="#cbd5e1" />
        <rect x="44" y="74" width="22" height="3.5" rx="1.75" fill="#e2e8f0" />

        {/* 4. Verification Checkmark Badge (Bottom Right of Document) */}
        <circle cx="86" cy="88" r="13.5" fill="url(#badgeGradient)" />
        <circle cx="86" cy="88" r="12.5" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.6" />
        
        {/* Crisp White Checkmark */}
        <path
          d="M 80 88 L 84.5 92.5 L 92.5 84"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 5. Mechanical Cog / Gear (Bottom Left Corner) */}
        <g transform="translate(18, 72)">
          <path
            d="M 18 5 L 20.5 5 L 21.5 8.5 L 25 9.5 L 27.5 7 L 29.5 8.5 L 29.5 12 L 32 14 L 35 14 L 35 17.5 L 33 20 L 33 22.5 L 35 25 L 34 28.5 L 30.5 28.5 L 28.5 31 L 28.5 34.5 L 25 34.5 L 22.5 32 L 20 33 L 19 36.5 L 15.5 35.5 L 15.5 32 L 12 31 L 9.5 33 L 7.5 32 L 8.5 28.5 L 6.5 26 L 3 25 L 4 21.5 L 6.5 20.5 L 6.5 17 L 4.5 14.5 L 5.5 11 L 9 12 L 11 9.5 L 11 6 L 14.5 6 L 17 8.5 Z"
            fill="url(#gearGradient)"
            stroke="#001f3f"
            strokeWidth="0.8"
          />
          {/* Gear Axle Hole */}
          <circle cx="19.5" cy="20.5" r="5" fill="#001833" />
          <circle cx="19.5" cy="20.5" r="4" fill="#003566" />
        </g>
      </svg>

      {/* Typography Section matching exact banner from reference */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col justify-center leading-tight whitespace-nowrap min-w-0">
          <div className="flex items-baseline font-black tracking-tight font-sans whitespace-nowrap">
            <span className={`${textColor === 'white' ? 'text-white' : 'text-slate-900'} ${scale.titleText} uppercase font-extrabold tracking-tight whitespace-nowrap`}>
              GESTÃO DE&nbsp;
            </span>
            <span className={`text-[#00c2ff] ${scale.titleText} uppercase font-black whitespace-nowrap drop-shadow-[0_0_8px_rgba(0,194,255,0.4)]`}>
              DCN<span className="text-[0.88em]">s</span>
            </span>
          </div>

          <span className={`text-[#00c2ff] ${scale.subText} font-bold tracking-[0.2em] uppercase font-sans mt-0.5 whitespace-nowrap inline-block`}>
            ENGINEERING CONTROL
          </span>
        </div>
      )}

      {/* Optional Zebra Technologies Section */}
      {(showZebra || variant === 'with-zebra' || variant === 'banner') && (
        <>
          <div className="h-9 w-px bg-white/25 mx-2 shrink-0" />
          <ZebraLogo 
            size={size === 'sm' ? 'sm' : size === 'lg' || size === 'xl' ? 'lg' : 'md'} 
            textColor={textColor}
          />
        </>
      )}
    </>
  );

  if (variant === 'banner') {
    return (
      <div 
        className={`bg-[#002f5c] px-4 py-3 rounded-xl border border-[#004e8f] shadow-lg flex items-center justify-between overflow-x-auto select-none ${className}`} 
        id="dcn-official-banner"
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center ${scale.gap} select-none whitespace-nowrap ${className}`} 
      id="dcn-official-logo"
    >
      {renderContent()}
    </div>
  );
};

