import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

// The catm shell's background: solid bg plus two soft radial washes (brand
// blue from the top-left, warm peach from the bottom-right) plus a faint
// dotted noise texture. Recreated here as layered backgrounds.
export function Backdrop() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        backgroundImage: [
          "radial-gradient(circle at 0% 0%, rgba(91, 108, 255, 0.10), transparent 50%)",
          "radial-gradient(circle at 100% 100%, rgba(255, 170, 140, 0.09), transparent 55%)",
          `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='1' cy='1' r='1' fill='%23999' opacity='.16'/></svg>")`,
        ].join(", "),
      }}
    />
  );
}
