// 1400×560 marquee promotional tile — used if CWS picks the extension
// for editorial featuring on the homepage. Mirrors the marketing landing
// page bone structure: giant brand on the left, real catm UI on the
// right (DemoApp in panel mode, frozen at the "audio playing" moment).
import { AbsoluteFill } from "remotion";
import { BrandMark } from "../../../src/components/BrandMark";
import {
  MOCK_SESSIONS,
  SAMPLE_CHUNK_DURATIONS,
  SAMPLE_CHUNKS,
  SAMPLE_TEXT,
} from "../data";
import { DemoApp } from "../shells/DemoApp";
import { COLORS, FONT } from "../theme";

const PANEL_WIDTH = 420;

// The marquee tile is only 560 tall — trim to two paragraphs so the reader
// plus the now-playing dock both fit without the dock being clipped. The
// highlighted chunk (currentTime 18s) lands in the second paragraph.
const MARQUEE_TEXT = SAMPLE_TEXT.split("\n\n").slice(0, 2).join("\n\n");

export function PromoMarquee(): React.JSX.Element {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(91, 108, 255, 0.12), transparent 50%), radial-gradient(circle at 100% 100%, rgba(255, 170, 140, 0.10), transparent 55%)",
        display: "flex",
        flexDirection: "row",
        fontFamily: FONT.sans,
      }}
    >
      {/* Brand half — matches the marketing landing page lockup. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: "0 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMark size={108} />
          <div
            style={{
              fontSize: 132,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              color: COLORS.ink0,
              lineHeight: 0.88,
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
            fontSize: 13,
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
            fontSize: 22,
            lineHeight: 1.45,
            color: COLORS.ink1,
            letterSpacing: "-0.005em",
            maxWidth: 540,
          }}
        >
          Long-form text-to-speech, right inside your browser. Right-click any text — the side
          panel reads it back to you locally.
        </div>
      </div>

      {/* Real catm UI in side-panel mode, anchored to the right edge.
          Tall enough for the brandbar + topbar + composer + audio dock. */}
      <div
        style={{
          width: PANEL_WIDTH,
          height: "100%",
          flexShrink: 0,
          background: COLORS.bg,
          borderLeft: `1px solid ${COLORS.border}`,
          boxShadow: "-1px 0 0 rgba(13,14,18,0.06), -24px 0 60px rgba(13,14,18,0.10)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: PANEL_WIDTH, height: "100%" }}>
          <DemoApp
            mode="panel"
            sessions={MOCK_SESSIONS.slice(0, 1)}
            activeId={"s-current"}
            title="The deep sea has been hiding from us"
            sourceText={MARQUEE_TEXT}
            voice="af_heart"
            speed={1.25}
            status={{ kind: "ready", device: "webgpu" }}
            currentTime={18}
            durationSec={40}
            chunkDurations={SAMPLE_CHUNK_DURATIONS}
            chunkTexts={SAMPLE_CHUNKS}
            playing={true}
            showDock={true}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
