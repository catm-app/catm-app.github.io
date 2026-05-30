// 1280×720 YouTube thumbnail. Mirrors the marquee lockup but tuned for
// the small-player / high-contrast demands of a video thumbnail: a punchy
// headline on the left, the real catm UI (panel mode, mid-playback) on the
// right. Still-only composition rendered via `render.sh thumbnail`.
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

const PANEL_WIDTH = 460;

export function YouTubeThumbnail(): React.JSX.Element {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(91, 108, 255, 0.16), transparent 48%), radial-gradient(circle at 100% 100%, rgba(255, 170, 140, 0.12), transparent 52%)",
        display: "flex",
        flexDirection: "row",
        fontFamily: FONT.sans,
      }}
    >
      {/* Headline half. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
          padding: "0 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <BrandMark size={96} />
          <div
            style={{
              fontSize: 124,
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
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            color: COLORS.ink0,
            maxWidth: 620,
          }}
        >
          Your browser reads{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentEnd})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            anything
          </span>{" "}
          aloud.
        </div>

        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 17,
            color: COLORS.ink3,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ width: 28, height: 1, background: COLORS.ink4 }} />
          100% local · no server · free
        </div>
      </div>

      {/* Real catm UI, side-panel mode, frozen mid-playback. */}
      <div
        style={{
          width: PANEL_WIDTH,
          height: "100%",
          flexShrink: 0,
          background: COLORS.bg,
          borderLeft: `1px solid ${COLORS.border}`,
          boxShadow: "-1px 0 0 rgba(13,14,18,0.06), -28px 0 70px rgba(13,14,18,0.12)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: PANEL_WIDTH, height: "100%" }}>
          <DemoApp
            mode="panel"
            sessions={MOCK_SESSIONS.slice(0, 1)}
            activeId={"s-current"}
            title="The deep sea has been hiding from us"
            sourceText={SAMPLE_TEXT}
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
