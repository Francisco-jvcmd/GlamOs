export interface GlamOSLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
}

export function GlamOSEmblem({ size = 96, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/20 via-amber-400/25 to-rose-600/30 blur-xl animate-pulse" />

      {/* Main SVG Emblem */}
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-[0_12px_24px_rgba(76,5,25,0.25)]"
      >
        <defs>
          {/* Metallic Champagne Gold */}
          <linearGradient id="glamGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF6D6" />
            <stop offset="25%" stopColor="#F6D365" />
            <stop offset="55%" stopColor="#FDA085" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          {/* Liquid Rose Gold */}
          <linearGradient id="glamRose" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE4E6" />
            <stop offset="30%" stopColor="#FB7185" />
            <stop offset="65%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Deep Velvet Royal */}
          <linearGradient id="glamVelvet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D0A22" />
            <stop offset="50%" stopColor="#1E0517" />
            <stop offset="100%" stopColor="#0F020B" />
          </linearGradient>

          {/* Silken Hair Flow */}
          <linearGradient id="glamHair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF1F2" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FDA4AF" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#B45309" stopOpacity="0.9" />
          </linearGradient>

          {/* Blade Metallic Chrome Highlight */}
          <linearGradient id="bladeHighlight" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#FFE4E6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#BE123C" stopOpacity="0.1" />
          </linearGradient>

          {/* Sparkle Glow */}
          <radialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FDE68A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Medallion Outer Filigree Ring */}
        <circle
          cx="70"
          cy="70"
          r="66"
          fill="none"
          stroke="url(#glamGold)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.6"
        />

        {/* 2. Inner Shield with Velvet Dark/Rose Background */}
        <circle
          cx="70"
          cy="70"
          r="61"
          fill="url(#glamVelvet)"
          stroke="url(#glamGold)"
          strokeWidth="2.5"
        />

        {/* 3. Subtle Concentric Guilloche Pattern */}
        <circle cx="70" cy="70" r="54" fill="none" stroke="url(#glamRose)" strokeWidth="0.8" opacity="0.35" />
        <circle cx="70" cy="70" r="46" fill="none" stroke="url(#glamGold)" strokeWidth="0.6" opacity="0.25" />

        {/* 4. Fluid Hair Ribbon / Stylist Wave Swirl */}
        <path
          d="M 32 88 C 30 55, 60 30, 88 28 C 104 27, 114 36, 110 50 C 105 66, 85 75, 68 84 C 52 92, 42 104, 52 114 C 57 118, 66 119, 74 116"
          fill="none"
          stroke="url(#glamHair)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 36 84 C 36 58, 62 36, 88 34 C 100 33, 108 40, 105 50"
          fill="none"
          stroke="#FFFBEB"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* 5. Master Salon Shears (Left Blade & Handle) */}
        {/* Left Loop */}
        <circle
          cx="44"
          cy="98"
          r="13"
          fill="none"
          stroke="url(#glamGold)"
          strokeWidth="4.5"
        />
        <circle
          cx="44"
          cy="98"
          r="13"
          fill="none"
          stroke="url(#bladeHighlight)"
          strokeWidth="1.5"
        />
        {/* Tang / Finger rest */}
        <path
          d="M 33 104 C 28 108, 26 114, 28 118"
          fill="none"
          stroke="url(#glamGold)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Left Blade Shaft to Tip */}
        <path
          d="M 49 88 L 68 66 L 94 28 C 96 25, 99 26, 98 29 L 75 69 L 55 90 Z"
          fill="url(#glamGold)"
        />
        {/* Left Blade Highlight */}
        <path
          d="M 68 66 L 94 28 C 95 26, 97 27, 96 30 L 73 68 Z"
          fill="url(#bladeHighlight)"
        />

        {/* 6. Master Salon Shears (Right Blade & Handle) */}
        {/* Right Loop */}
        <circle
          cx="94"
          cy="98"
          r="13"
          fill="none"
          stroke="url(#glamRose)"
          strokeWidth="4.5"
        />
        <circle
          cx="94"
          cy="98"
          r="13"
          fill="none"
          stroke="url(#bladeHighlight)"
          strokeWidth="1.5"
        />
        {/* Right Blade Shaft to Tip */}
        <path
          d="M 89 88 L 71 66 L 46 28 C 44 25, 41 26, 42 29 L 65 69 L 83 90 Z"
          fill="url(#glamRose)"
        />
        {/* Right Blade Highlight */}
        <path
          d="M 71 66 L 46 28 C 45 26, 43 27, 44 30 L 67 68 Z"
          fill="url(#bladeHighlight)"
        />

        {/* 7. Central Pivot Gem / Screw (Ruby Diamond) */}
        <circle cx="70" cy="67" r="5.5" fill="url(#glamGold)" />
        <circle cx="70" cy="67" r="3.5" fill="#E11D48" />
        <circle cx="69" cy="66" r="1.2" fill="#FFFFFF" />

        {/* 8. Specular Diamond Sparkles (Haute Glamour) */}
        {/* Top-Right Big Star */}
        <g transform="translate(102, 22)">
          <path
            d="M 0 -8 Q 1 -1 8 0 Q 1 1 0 8 Q -1 1 -8 0 Q -1 -1 0 -8 Z"
            fill="url(#sparkleGlow)"
          />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>

        {/* Top-Left Small Star */}
        <g transform="translate(38, 20)">
          <path
            d="M 0 -5 Q 0.8 -0.8 5 0 Q 0.8 0.8 0 5 Q -0.8 0.8 -5 0 Q -0.8 -0.8 0 -5 Z"
            fill="url(#sparkleGlow)"
          />
          <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
        </g>

        {/* Center Bottom Mini Star */}
        <g transform="translate(70, 118)">
          <path
            d="M 0 -4 Q 0.6 -0.6 4 0 Q 0.6 0.6 0 4 Q -0.6 0.6 -4 0 Q -0.6 -0.6 0 -4 Z"
            fill="url(#sparkleGlow)"
          />
          <circle cx="0" cy="0" r="0.8" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

export function GlamOSLogo({
  size = 96,
  showText = true,
  className = '',
}: GlamOSLogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <GlamOSEmblem size={size} />

      {showText && (
        <div className="mt-4 text-center select-none">
          <div className="flex items-center justify-center tracking-tight">
            <span
              className="text-4xl sm:text-5xl font-bold italic font-serif bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] bg-clip-text text-transparent drop-shadow-sm pr-0.5"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Glam
            </span>
            <span
              className="text-3xl sm:text-4xl font-extrabold tracking-widest text-gray-900 ml-1 uppercase"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              OS
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="h-[1px] w-5 bg-gradient-to-r from-transparent to-[#F6D365]" />
            <p className="text-[11px] uppercase tracking-[0.25em] text-rose-900/60 font-semibold">
              Haute Salon & Spa System
            </p>
            <span className="h-[1px] w-5 bg-gradient-to-l from-transparent to-[#F6D365]" />
          </div>
        </div>
      )}
    </div>
  );
}
