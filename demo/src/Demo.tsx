import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill } from "remotion";
import { SceneCTA } from "./scenes/SceneCTA";
import { SceneHook } from "./scenes/SceneHook";
import { SceneHow } from "./scenes/SceneHow";
import { ScenePrivacy } from "./scenes/ScenePrivacy";
import { SceneProgressive } from "./scenes/SceneProgressive";
import { ScenePromise } from "./scenes/ScenePromise";
import { COLORS, SCENES, TRANSITION_FRAMES } from "./theme";

const fadeT = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }),
});

const slideT = () => ({
  presentation: slide({ direction: "from-bottom" }),
  timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }),
});

export function Demo() {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.hook}>
          <SceneHook />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition {...slideT()} />

        <TransitionSeries.Sequence durationInFrames={SCENES.promise}>
          <ScenePromise />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={SCENES.privacy}>
          <ScenePrivacy />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={SCENES.progressive}>
          <SceneProgressive />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition {...slideT()} />

        <TransitionSeries.Sequence durationInFrames={SCENES.how}>
          <SceneHow />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition {...fadeT()} />

        <TransitionSeries.Sequence durationInFrames={SCENES.cta}>
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
