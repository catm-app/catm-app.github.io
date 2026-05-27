// Bottom-anchored copy strip. Toggled by the composition's `overlay` prop —
// when off (used for CWS stills) the strip disappears entirely so the
// underlying UI is captured cleanly. Fade-in keyed off the local scene
// frame, not the global composition frame.
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";

interface CopyOverlayProps {
  overlay: boolean;
  /** Big headline. */
  title: React.ReactNode;
  /** Optional subhead under the title. */
  subtitle?: React.ReactNode;
  /** Frame at which to start fading in (within the scene). Default 6. */
  startFrame?: number;
  /** Where the strip sits. Default "bottom". */
  position?: "bottom" | "top";
  /** Alignment of the text within the strip. Default "left". */
  align?: "left" | "center";
}

export function CopyOverlay({
  overlay,
  title,
  subtitle,
  startFrame = 6,
  position = "bottom",
  align = "left",
}: CopyOverlayProps): React.JSX.Element | null {
  const frame = useCurrentFrame();
  if (!overlay) return null;
  const fade = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = interpolate(frame, [startFrame, startFrame + 18], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const placement =
    position === "bottom" ? { bottom: 36, left: 36, right: 36 } : { top: 36, left: 36, right: 36 };

  // Soft scrim behind the copy so it reads against any underlying UI.
  const scrimDirection = position === "bottom" ? "to top" : "to bottom";
  const scrimGradient = `linear-gradient(${scrimDirection}, rgba(250,251,252,0.92) 0%, rgba(250,251,252,0.78) 40%, rgba(250,251,252,0) 100%)`;
  const scrimHeight = 220;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          ...(position === "bottom"
            ? { bottom: 0, height: scrimHeight }
            : { top: 0, height: scrimHeight }),
          background: scrimGradient,
          opacity: fade,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          ...placement,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          opacity: fade,
          transform: `translateY(${lift}px)`,
          pointerEvents: "none",
          fontFamily: FONT.sans,
          textAlign: align,
          alignItems: align === "center" ? "center" : "flex-start",
        }}
      >
      <div
        style={{
          fontSize: 36,
          lineHeight: 1.15,
          fontWeight: 700,
          letterSpacing: "-0.022em",
          color: COLORS.ink0,
          // Subtle white halo so the headline reads over screenshot UI.
          textShadow: "0 1px 0 rgba(255,255,255,0.85), 0 8px 28px rgba(13,14,18,0.12)",
          maxWidth: align === "center" ? "100%" : 720,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 18,
            lineHeight: 1.4,
            fontWeight: 500,
            color: COLORS.ink2,
            letterSpacing: "-0.005em",
            textShadow: "0 1px 0 rgba(255,255,255,0.6)",
            maxWidth: align === "center" ? "100%" : 640,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      </div>
    </>
  );
}
