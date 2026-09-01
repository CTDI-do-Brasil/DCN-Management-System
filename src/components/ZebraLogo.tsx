import React from 'react';

interface ZebraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only';
  textColor?: 'white' | 'dark';
}

export const ZebraLogo: React.FC<ZebraLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  textColor = 'white'
}) => {
  const dimensions = {
    sm: { iconWidth: 28, iconHeight: 28, titleSize: 'text-sm', subSize: 'text-[7px]', gap: 'gap-2' },
    md: { iconWidth: 42, iconHeight: 42, titleSize: 'text-xl', subSize: 'text-[9px]', gap: 'gap-3' },
    lg: { iconWidth: 54, iconHeight: 54, titleSize: 'text-2xl', subSize: 'text-[11px]', gap: 'gap-3.5' },
    xl: { iconWidth: 68, iconHeight: 68, titleSize: 'text-3xl', subSize: 'text-xs', gap: 'gap-4' }
  }[size];

  const mainColor = textColor === 'white' ? '#FFFFFF' : '#00386e';

  return (
    <div className={`flex items-center ${dimensions.gap} select-none ${className}`} id="zebra-official-logo">
      {/* High-Fidelity Zebra Technologies Head & Stripes Vector */}
      <svg
        width={dimensions.iconWidth}
        height={dimensions.iconHeight}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Top Ear */}
        <path
          d="M 50 12 C 50 12 55 12 55 24 C 55 27 52 30 48 30 C 44 30 44 24 44 24 C 44 14 49 12 50 12 Z"
          fill={mainColor}
        />
        {/* Mane / Back Stripe 1 (Leftmost) */}
        <path
          d="M 28 22 L 35 15 L 43 23 L 43 65 L 53 75 L 53 85 L 35 67 L 35 30 L 28 22 Z"
          fill={mainColor}
        />
        {/* Mane / Neck Stripe 2 */}
        <path
          d="M 20 38 L 27 31 L 34 38 L 34 68 L 47 81 L 47 91 L 27 71 L 27 45 L 20 38 Z"
          fill={mainColor}
        />
        {/* Diagonal Stripe 3 */}
        <path
          d="M 20 58 L 26 52 L 39 65 L 39 88 L 33 94 L 20 81 L 20 58 Z"
          fill={mainColor}
        />
        {/* Center Muzzle Diagonal 4 */}
        <path
          d="M 43 42 L 53 32 L 62 41 L 62 58 L 54 66 L 43 55 L 43 42 Z"
          fill={mainColor}
        />
        {/* Snout Stripe 5 */}
        <path
          d="M 54 30 L 61 23 L 73 35 L 73 54 L 66 61 L 66 42 L 54 30 Z"
          fill={mainColor}
        />
        {/* Upper Snout / Nose Ridge */}
        <path
          d="M 64 21 L 71 14 L 83 26 L 83 45 L 76 52 L 76 33 L 64 21 Z"
          fill={mainColor}
        />
        {/* Snout Tip Circle / Muzzle Dot */}
        <circle cx="88" cy="56" r="6" fill={mainColor} />
      </svg>

      {/* Typography: ZEBRA TECHNOLOGIES */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col justify-center leading-none">
          <span 
            className={`font-black uppercase tracking-wider font-sans ${dimensions.titleSize}`}
            style={{ color: mainColor, letterSpacing: '0.08em' }}
          >
            ZEBRA
          </span>
          <span 
            className={`font-bold uppercase tracking-[0.24em] font-sans mt-0.5 ${dimensions.subSize}`}
            style={{ color: mainColor, opacity: 0.95 }}
          >
            TECHNOLOGIES
          </span>
        </div>
      )}
    </div>
  );
};
