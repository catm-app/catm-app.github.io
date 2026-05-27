// Remotion composition registry. One composition emits both the full video
// (overlay: true) and CWS stills (overlay: false) via --props at render time.
import { Composition } from "remotion";
import "../../src/app.css";
import { Demo } from "./Demo";
import { FPS, TOTAL_FRAMES } from "./theme";

// Cast so the Composition's index-signature constraint accepts the typed
// Demo component. Remotion 4's typed-schema API uses zod; we keep props
// flat and JSON-serialisable to render with `--props='{"overlay":false}'`.
const TypedComposition = Composition as React.FC<{
  id: string;
  component: typeof Demo;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: { overlay: boolean };
}>;

export const RemotionRoot = (): React.JSX.Element => {
  return (
    <TypedComposition
      id="Demo"
      component={Demo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1280}
      height={800}
      defaultProps={{ overlay: true }}
    />
  );
};
