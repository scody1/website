import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  lightText?: boolean;
}

export default function Logo({ size = 'md', showText = true, className = '', lightText = false }: LogoProps) {
  const sizeMap = {
    sm: { box: 'w-9 h-9', title: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-12 h-12 sm:w-14 sm:h-14', title: 'text-lg sm:text-2xl', sub: 'text-[10px] sm:text-[11px]' },
    lg: { box: 'w-16 h-16 sm:w-20 sm:h-20', title: 'text-2xl sm:text-3xl', sub: 'text-xs' },
    xl: { box: 'w-24 h-24 sm:w-28 sm:h-28', title: 'text-3xl sm:text-4xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Custom Sacred Religious Emblem SVG */}
      <div className={`${currentSize.box} flex-shrink-0 drop-shadow-md transition-transform duration-300 hover:scale-105`}>
        <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Antique Temple Gold Gradient */}
            <linearGradient id="rpsGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF2B2" />
              <stop offset="45%" stopColor="#C89D54" />
              <stop offset="100%" stopColor="#946A29" />
            </linearGradient>

            {/* Deep Temple Maroon Radial Gradient */}
            <radialGradient id="rpsMaroonGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8E1B1B" />
              <stop offset="70%" stopColor="#6E1414" />
              <stop offset="100%" stopColor="#3D0A0A" />
            </radialGradient>

            {/* Glowing Jyoti Flame Gradient */}
            <linearGradient id="rpsFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#E66A1F" />
              <stop offset="60%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#FFF9C4" />
            </linearGradient>
          </defs>

          {/* 1. Ornate Golden Mandala Sunburst Outer Ring (#C89D54) */}
          <g fill="url(#rpsGoldGrad)">
            <circle cx="60" cy="60" r="56" opacity="0.3" />
            {/* 24-Ray Sacred Mandala Sunburst */}
            <path d="M60 2 L66 11 L76 7 L80 17 L91 16 L92 27 L103 29 L101 40 L112 44 L107 55 L116 62 L107 70 L112 80 L101 85 L103 96 L92 97 L91 108 L80 107 L76 117 L66 113 L60 118 L54 113 L44 117 L40 107 L29 108 L28 97 L17 96 L19 85 L8 80 L13 70 L4 62 L13 55 L8 44 L19 40 L17 29 L28 27 L29 16 L40 17 L44 7 L54 11 Z" />
          </g>

          {/* 2. Deep Temple Maroon Medallion Center (#6E1414) */}
          <circle cx="60" cy="60" r="47" fill="url(#rpsMaroonGrad)" stroke="url(#rpsGoldGrad)" strokeWidth="3" />
          {/* Subtle beaded inner ring */}
          <circle cx="60" cy="60" r="41" fill="none" stroke="#FFF2B2" strokeWidth="1" strokeDasharray="2.5 3.5" opacity="0.85" />

          {/* 3. Glowing Jyoti Flame */}
          <path d="M60 14 C54 23, 53 29, 60 34 C67 29, 66 23, 60 14 Z" fill="url(#rpsFlameGrad)" />
          <path d="M60 20 C58 24, 58 27, 60 30 C62 27, 62 24, 60 20 Z" fill="#FFFFFF" opacity="0.9" />

          {/* Auspicious Arch Banner */}
          <path d="M28 54 C28 32, 92 32, 92 54" fill="none" stroke="url(#rpsGoldGrad)" strokeWidth="1.8" opacity="0.8" />

          {/* 4. Sacred Golden Om Symbol (ॐ) */}
          <text
            x="60"
            y="70"
            textAnchor="middle"
            fill="url(#rpsGoldGrad)"
            fontSize="38"
            fontWeight="bold"
            fontFamily="'Cinzel', serif"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          >
            ॐ
          </text>

          {/* 5. Sacred Lotus Petals & Traditional Brass Kalash/Diya Base */}
          {/* Central Lotus Petal */}
          <path d="M60 99 C53 91, 47 84, 60 76 C73 84, 67 91, 60 99 Z" fill="url(#rpsGoldGrad)" />
          {/* Left Petal */}
          <path d="M58 97 C45 95, 36 88, 42 79 C49 84, 54 90, 58 97 Z" fill="#E66A1F" stroke="url(#rpsGoldGrad)" strokeWidth="1" />
          {/* Right Petal */}
          <path d="M62 97 C75 95, 84 88, 78 79 C71 84, 66 90, 62 97 Z" fill="#E66A1F" stroke="url(#rpsGoldGrad)" strokeWidth="1" />
          {/* Kalash / Diya Brass Base Rim */}
          <path d="M36 98 Q60 106 84 98" fill="none" stroke="url(#rpsGoldGrad)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="text-left">
          <span
            className={`font-serif ${currentSize.title} font-extrabold tracking-wider block leading-none ${
              lightText ? 'text-parchment-100' : 'text-maroon-700'
            }`}
          >
            RAJESHWAR
          </span>
          <span
            className={`${currentSize.sub} tracking-[0.24em] uppercase font-bold block mt-0.5 ${
              lightText ? 'text-gold-300' : 'text-amber-900'
            }`}
          >
            POOJA SAMAGRI
          </span>
        </div>
      )}
    </div>
  );
}
