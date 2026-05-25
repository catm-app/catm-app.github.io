import { COLORS } from "../theme";

interface BrandMarkProps {
  size?: number;
}

// Mirrors public/favicon.svg from the catm repo: gradient speech-bubble with a
// white C-shape inside. Re-implemented as inline SVG so Remotion can rasterise
// without an external asset.
export function BrandMark({ size = 96 }: BrandMarkProps) {
  const id = `bm-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={COLORS.accent} />
          <stop offset="100%" stopColor={COLORS.accentEnd} />
        </linearGradient>
      </defs>
      <path
        d="M18 4 H46 Q60 4 60 18 V40 Q60 54 46 54 H30 L20 62 L22.5 54 H18 Q4 54 4 40 V18 Q4 4 18 4 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M41 22 A12 12 0 1 0 41 36"
        fill="none"
        stroke="#ffffff"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
