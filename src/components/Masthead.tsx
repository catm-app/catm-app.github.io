import type { AppStatus, View } from "../types";

interface MastheadProps {
  view: View;
  status: AppStatus;
  straplineRight: React.ReactNode;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
}

export function Masthead({
  view,
  straplineRight,
  onOpenSettings,
  onCloseSettings,
}: MastheadProps): React.JSX.Element {
  const settingsOpen = view === "settings";
  return (
    <>
      <header className="masthead">
        <div className="vol">
          Vol. <b>01</b> Issue 08 · MMXXVI
        </div>
        <div className="brand">
          <h1 className="wordmark">catm.</h1>
          <div className="tagline">come and talk to me</div>
        </div>
        <div className="price">
          <div>
            Cover <b>$0.00</b> Free · MIT
          </div>
          <button
            type="button"
            className={settingsOpen ? "gear on" : "gear"}
            aria-label={settingsOpen ? "Close settings" : "Open settings"}
            title="Settings"
            onClick={settingsOpen ? onCloseSettings : onOpenSettings}
            data-testid="gear"
          >
            ⚙
          </button>
        </div>
      </header>
      <div className="strapline">
        <span>
          ★ ★ ★ <b>READ ANYTHING.</b> OUT LOUD. ★ ★ ★
        </span>
        <span>{straplineRight}</span>
      </div>
    </>
  );
}

export function Colophon(): React.JSX.Element {
  return (
    <footer className="colophon">
      <a href="https://github.com/catm-app" target="_blank" rel="noopener noreferrer">
        <span className="arrow">↗</span>source · github.com/catm-app
      </a>
      <span className="meta">printed in your browser · mmxxvi</span>
    </footer>
  );
}
