// Fake third-party article page used by the "select text" scene. Looks
// generic / blog-y so the visual narrative reads as "any web page".
import { ARTICLE_LEAD, ARTICLE_TITLE } from "../data";
import { COLORS, FONT } from "../theme";

interface MockWebpageProps {
  /** When set, highlights this substring of ARTICLE_LEAD as a "selection". */
  selection?: { start: number; end: number } | null;
  /** Show the right-click context menu at this position. */
  contextMenu?: { x: number; y: number } | null;
}

export function MockWebpage({ selection, contextMenu }: MockWebpageProps): React.JSX.Element {
  let before = ARTICLE_LEAD;
  let selected = "";
  let after = "";
  if (selection) {
    before = ARTICLE_LEAD.slice(0, selection.start);
    selected = ARTICLE_LEAD.slice(selection.start, selection.end);
    after = ARTICLE_LEAD.slice(selection.end);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.bgSurface,
        color: COLORS.ink1,
        fontFamily: FONT.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Faux browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "#eeeff2",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              background: "#ed6a5e",
            }}
          />
          <span
            style={{ width: 12, height: 12, borderRadius: 12, background: "#f5bf4f" }}
          />
          <span
            style={{ width: 12, height: 12, borderRadius: 12, background: "#62c554" }}
          />
        </span>
        <div
          style={{
            flex: 1,
            background: COLORS.bgSurface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            color: COLORS.ink3,
            fontSize: 13,
          }}
        >
          https://example.com/articles/the-deep-sea
        </div>
      </div>

      {/* Article body */}
      <article
        style={{
          flex: 1,
          maxWidth: 760,
          width: "100%",
          margin: "48px auto",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: COLORS.ink3,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Oceans · Long read
        </div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: COLORS.ink0,
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          {ARTICLE_TITLE}
        </h1>
        <p
          style={{
            fontSize: 19,
            lineHeight: 1.65,
            color: COLORS.ink1,
            letterSpacing: "-0.005em",
          }}
        >
          {before}
          {selected ? (
            <span
              style={{
                background: "#b4d7ff",
                color: COLORS.ink0,
              }}
            >
              {selected}
            </span>
          ) : null}
          {after}
        </p>
      </article>

      {contextMenu ? <ContextMenu x={contextMenu.x} y={contextMenu.y} /> : null}
    </div>
  );
}

function ContextMenu({ x, y }: { x: number; y: number }): React.JSX.Element {
  const items = [
    { label: "Copy", shortcut: "Ctrl+C" },
    { label: "Search Google for selection", shortcut: null },
    { label: "Print…", shortcut: "Ctrl+P" },
    { label: "Inspect", shortcut: null },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 280,
        background: COLORS.bgSurface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "6px 0",
        fontSize: 13,
        color: COLORS.ink1,
        fontFamily: FONT.sans,
        boxShadow:
          "0 1px 2px rgba(13, 14, 18, 0.04), 0 24px 60px rgba(13, 14, 18, 0.18)",
        zIndex: 10,
      }}
    >
      {items.map((item) => (
        <Row key={item.label} label={item.label} shortcut={item.shortcut} />
      ))}
      <div
        style={{
          height: 1,
          background: COLORS.border,
          margin: "6px 0",
        }}
      />
      {/* The hero row — the catm action. Highlighted as if hovered. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: COLORS.accent,
          color: "white",
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: "rgba(255,255,255,0.18)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          c
        </span>
        catm · Read it to me
      </div>
    </div>
  );
}

function Row({ label, shortcut }: { label: string; shortcut: string | null }): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 14px",
        color: COLORS.ink1,
      }}
    >
      <span>{label}</span>
      {shortcut ? (
        <span style={{ color: COLORS.ink3, fontSize: 12, fontFamily: FONT.mono }}>{shortcut}</span>
      ) : null}
    </div>
  );
}
