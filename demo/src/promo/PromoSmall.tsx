// 440×280 small promotional tile. Brand-forward, no product visuals —
// at this size, fewer elements read better. Used in CWS category/search
// surfaces.
import { AbsoluteFill } from "remotion";
import { BrandMark } from "../../../src/components/BrandMark";
import { COLORS, FONT } from "../theme";

export function PromoSmall(): React.JSX.Element {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(91, 108, 255, 0.16), transparent 50%), radial-gradient(circle at 100% 100%, rgba(255, 170, 140, 0.12), transparent 55%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.sans,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 20,
          padding: "0 36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandMark size={66} />
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: COLORS.ink0,
              lineHeight: 0.9,
            }}
          >
            cat
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentEnd})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              m
            </span>
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 12,
            color: COLORS.ink3,
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ width: 22, height: 1, background: COLORS.ink4 }} />
          come and talk to me
        </div>

        <div
          style={{
            fontSize: 18,
            lineHeight: 1.35,
            color: COLORS.ink1,
            letterSpacing: "-0.005em",
            maxWidth: 360,
          }}
        >
          Long-form text-to-speech,{" "}
          <b style={{ color: COLORS.ink0 }}>right inside your browser.</b>
        </div>
      </div>

    </AbsoluteFill>
  );
}
