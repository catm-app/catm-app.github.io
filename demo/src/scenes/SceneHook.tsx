import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandMark } from "../components/BrandMark";
import { COLORS, FONT } from "../theme";

export function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markScale = spring({ frame, fps, config: { damping: 200 } });
  const wordmarkOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordmarkY = interpolate(frame, [20, 40], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [40, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [40, 64], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.sans,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            transform: `scale(${markScale})`,
          }}
        >
          <BrandMark size={132} />
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: COLORS.ink0,
              opacity: wordmarkOpacity,
              transform: `translateY(${wordmarkY}px)`,
              lineHeight: 1,
            }}
          >
            catm
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              color: COLORS.ink3,
              opacity: taglineOpacity,
              transform: `translateY(${taglineY}px)`,
            }}
          >
            come and talk to me
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
