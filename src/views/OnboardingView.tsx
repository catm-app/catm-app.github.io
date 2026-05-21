import type { AppStatus } from "../types";

interface OnboardingViewProps {
  status: AppStatus;
  onStartDownload: () => void;
}

export function OnboardingView({
  status,
  onStartDownload,
}: OnboardingViewProps): React.JSX.Element {
  if (status.kind === "downloading" || status.kind === "loading") {
    return <DownloadingHero status={status} />;
  }
  return <FirstLaunchHero onStartDownload={onStartDownload} />;
}

function FirstLaunchHero({ onStartDownload }: { onStartDownload: () => void }): React.JSX.Element {
  return (
    <section className="onboard-stage">
      <section className="hero-panel" data-numeral="01" aria-label="First launch">
        <div className="hero-kicker">▸ first time here</div>
        <h1 className="hero-title">
          Read <em>anything.</em>
          <br />
          Out <em>loud.</em>
        </h1>
        <p className="hero-copy">
          catm reads articles, chapters, notes — anything you'd rather hear than skim — out loud,
          right in your browser. The voice runs on your device, not a server. Once it's downloaded,
          you can read offline forever.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="btn primary"
            onClick={onStartDownload}
            data-testid="start-download"
          >
            ↓ Download voice · 80 mb
          </button>
        </div>
      </section>

      <aside className="right-col">
        <section className="sidebar-card voice-info-card">
          <h4>
            What you'll get <span className="sub">low tier · default</span>
          </h4>
          <div className="v-name">
            Kokoro
            <span className="small">82M params · ONNX · Apache-2.0</span>
          </div>
          <div className="row">
            <b>Disk</b>
            <span className="v">80 mb · one-time</span>
          </div>
          <div className="row">
            <b>Ram (synthesis)</b>
            <span className="v">~600 mb</span>
          </div>
          <div className="row">
            <b>Language</b>
            <span className="v">English (4 voices)</span>
          </div>
          <div className="row">
            <b>Privacy</b>
            <span className="v">stays on this device</span>
          </div>
        </section>

        <section className="tip-card">
          <div className="kicker">▸ heads up</div>
          <div className="body">
            The voice downloads once and then lives in your browser's private storage. We never see
            what you paste in — there's no server.
          </div>
        </section>
      </aside>
    </section>
  );
}

function DownloadingHero({
  status,
}: {
  status: Extract<AppStatus, { kind: "downloading" } | { kind: "loading" }>;
}): React.JSX.Element {
  const fraction = status.kind === "downloading" ? status.fraction : 0;
  const pct = Math.round(fraction * 100);
  const loadedMb = status.kind === "downloading" ? status.loadedMb : 0;
  const totalMb = status.kind === "downloading" ? status.totalMb : 80;

  return (
    <section className="onboard-stage">
      <section className="progress-card" aria-label="Voice download progress">
        <span className="stamp">downloading · 1 of 1</span>
        <div className="pct" data-testid="download-pct">
          {pct}
          <span className="symbol">%</span>
        </div>
        <div className="meta">
          {loadedMb.toFixed(1)} / {totalMb.toFixed(0)} mb
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="nudge">
          Don't close this tab. The voice is being saved to your browser's private storage — next
          time, it'll already be here.
        </div>
      </section>

      <aside className="right-col">
        <section className="tip-card">
          <div className="kicker">▸ while you wait</div>
          <div className="body">
            Once the voice lands, you can paste long-form text — chapters, papers, threads — and
            catm starts speaking within a few seconds. No need to wait for the whole thing to
            synthesise.
          </div>
        </section>

        <section className="sidebar-card voice-info-card">
          <h4>
            Coming up <span className="sub">{pct}% done</span>
          </h4>
          <div className="v-name">
            Kokoro
            <span className="small">82M params · ONNX · Apache-2.0</span>
          </div>
          <div className="row">
            <b>Tier</b>
            <span className="v">Low</span>
          </div>
          <div className="row">
            <b>Voices</b>
            <span className="v">af_heart + 3</span>
          </div>
          <div className="row">
            <b>Language</b>
            <span className="v">English</span>
          </div>
        </section>
      </aside>
    </section>
  );
}
