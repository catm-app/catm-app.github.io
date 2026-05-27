// Remotion composition registry. The Demo composition emits both the full
// video (overlay: true) and CWS stills (overlay: false) via --props at
// render time. PromoSmall + PromoMarquee are still-only compositions used
// for the CWS promotional tiles.
import { Composition } from "remotion";
import "../../src/app.css";
import { Demo } from "./Demo";
import { PromoMarquee } from "./promo/PromoMarquee";
import { PromoSmall } from "./promo/PromoSmall";
import { FPS, TOTAL_FRAMES } from "./theme";

// Cast so the Composition's index-signature constraint accepts the typed
// Demo component. Remotion 4's typed-schema API uses zod; we keep props
// flat and JSON-serialisable to render with `--props='{"overlay":false}'`.
const TypedDemo = Composition as React.FC<{
  id: string;
  component: typeof Demo;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: { overlay: boolean };
}>;

const PromoComposition = Composition as React.FC<{
  id: string;
  component: React.FC;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
}>;

export const RemotionRoot = (): React.JSX.Element => {
  return (
    <>
      <TypedDemo
        id="Demo"
        component={Demo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1280}
        height={800}
        defaultProps={{ overlay: true }}
      />
      <PromoComposition
        id="PromoSmall"
        component={PromoSmall}
        durationInFrames={1}
        fps={30}
        width={440}
        height={280}
      />
      <PromoComposition
        id="PromoMarquee"
        component={PromoMarquee}
        durationInFrames={1}
        fps={30}
        width={1400}
        height={560}
      />
    </>
  );
};
