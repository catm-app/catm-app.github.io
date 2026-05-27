// Side-panel playback scene. Article reflowed to a narrower column on the
// left; side panel pinned to the right showing the reader with audio
// playing and the highlight scrolling through chunks.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MOCK_SESSIONS, SAMPLE_CHUNK_DURATIONS, SAMPLE_CHUNKS, SAMPLE_TEXT } from "../data";
import { CopyOverlay } from "../overlay/CopyOverlay";
import { DemoApp } from "../shells/DemoApp";
import { MockWebpage } from "../shells/MockWebpage";

const SIDE_PANEL_WIDTH = 420;
const TOTAL_DURATION_SEC = 40;

interface SceneSidePanelProps {
  overlay: boolean;
}

export function SceneSidePanel({ overlay }: SceneSidePanelProps): React.JSX.Element {
  const frame = useCurrentFrame();
  // Scene runs ~12 s; drive playback through the source text a touch faster
  // than realtime so the highlight visibly progresses.
  const currentTime = (frame / 30) * (TOTAL_DURATION_SEC / 12);
  const cumulative = SAMPLE_CHUNK_DURATIONS.reduce((acc, d) => {
    acc.push((acc[acc.length - 1] ?? 0) + d);
    return acc;
  }, [] as number[]);
  const total = cumulative[cumulative.length - 1] ?? TOTAL_DURATION_SEC;
  const clampedTime = Math.min(currentTime, total - 0.1);

  return (
    <AbsoluteFill style={{ background: "#1a1c20", display: "flex", flexDirection: "row" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MockWebpage selection={null} contextMenu={null} />
      </div>

      <div
        style={{
          width: SIDE_PANEL_WIDTH,
          flexShrink: 0,
          background: "var(--bg-0)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        <DemoApp
          mode="panel"
          sessions={MOCK_SESSIONS.slice(0, 1)}
          activeId={"s-current"}
          title="The deep sea has been hiding from us"
          sourceText={SAMPLE_TEXT}
          voice="af_heart"
          speed={1.25}
          status={{ kind: "ready", device: "webgpu" }}
          currentTime={clampedTime}
          durationSec={TOTAL_DURATION_SEC}
          chunkDurations={SAMPLE_CHUNK_DURATIONS}
          chunkTexts={SAMPLE_CHUNKS}
          playing={true}
          showDock={true}
        />
      </div>

      <CopyOverlay
        overlay={overlay}
        title={
          <>
            Long-form,{" "}
            <em style={{ color: "#5b6cff", fontStyle: "normal" }}>natural voices</em>.
          </>
        }
        subtitle="Audio is generated locally in the browser. The text highlights along with the voice, so you can follow or skim."
      />
    </AbsoluteFill>
  );
}
