import type { SessionMeta } from "../storage/sessionStore";
import type { AppStatus } from "../types";
import type { VoiceId } from "../worker/kokoro.worker";

const MODEL_MB = 80;
const BUDGET_MB = 500;

function sessionsSizeMb(library: SessionMeta[]): number {
  const seconds = library.reduce((acc, s) => acc + s.durationSec, 0);
  return Math.round((seconds * 48) / 1024);
}

interface VoiceOption {
  id: VoiceId;
  name: string;
  suffix: string;
  desc: string;
}

const VOICES: VoiceOption[] = [
  { id: "af_heart", name: "af_", suffix: "heart", desc: "feminine · warm" },
  { id: "af_bella", name: "af_", suffix: "bella", desc: "feminine · bright" },
  { id: "am_michael", name: "am_", suffix: "michael", desc: "masculine · neutral" },
  { id: "am_eric", name: "am_", suffix: "eric", desc: "masculine · dry" },
];

interface SettingsViewProps {
  library: SessionMeta[];
  voice: VoiceId;
  previewVoice: VoiceId | null;
  status: AppStatus;
  onChangeVoice: (v: VoiceId) => void;
  onPreviewVoice: (v: VoiceId) => void;
  onClearSessions: () => void;
  onDeleteModel: () => void;
  onBack: () => void;
}

export function SettingsView({
  library,
  voice,
  previewVoice,
  status,
  onChangeVoice,
  onPreviewVoice,
  onClearSessions,
  onDeleteModel,
  onBack,
}: SettingsViewProps): React.JSX.Element {
  const sessionsMb = sessionsSizeMb(library);
  const usedMb = sessionsMb + MODEL_MB;
  const voicePct = (MODEL_MB / BUDGET_MB) * 100;
  const sessionsPct = (sessionsMb / BUDGET_MB) * 100;
  const canPreview = status.kind === "ready" && previewVoice === null;

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={onBack}
        data-testid="settings-back"
        style={{ marginTop: 24, cursor: "pointer" }}
      >
        ← back to editor
      </button>

      <section className="slab">
        <div className="settings-stack">
          <section className="section" aria-label="Voice">
            <div className="section-head">
              <h3>Voice</h3>
              <span className="sub">kokoro · low tier · installed</span>
            </div>

            <div className="voice-stage">
              <div className="tier-picker" aria-label="Model tier">
                <div className="tier-row on expanded">
                  <button
                    type="button"
                    className="tier-delete"
                    aria-label="Delete Kokoro model"
                    title="Delete model"
                    onClick={onDeleteModel}
                    data-testid="delete-model"
                  >
                    ✕
                  </button>
                  <div className="head">
                    <div className="left">
                      <span className="nm">Low</span>
                      <span className="model">Kokoro · 82M · Apache-2.0</span>
                    </div>
                    <div className="blurb">
                      Good — clearly synthetic but pleasant. Long-listen friendly.
                    </div>
                  </div>
                  <div className="body">
                    <div className="res">
                      Disk
                      <b>80 mb</b>
                      <span className="res-extra">one-time</span>
                    </div>
                    <div className="res">
                      Ram
                      <b>~600 mb</b>
                      <span className="res-extra">during synthesis</span>
                    </div>
                    <div className="res">
                      Speed
                      <b>1.25×</b>
                      <span className="res-extra">default</span>
                    </div>
                    <div className="res">
                      Voices
                      <b>{VOICES.length}</b>
                      <span className="res-extra">english</span>
                    </div>
                  </div>
                </div>

                <div className="tier-row disabled" aria-disabled="true">
                  <div className="head">
                    <div className="left">
                      <span className="nm">Medium</span>
                      <span className="model">Coming soon</span>
                    </div>
                    <div className="blurb">
                      Better — closer to a human narrator. Needs a modern device.
                    </div>
                  </div>
                </div>

                <div className="tier-row disabled" aria-disabled="true">
                  <div className="head">
                    <div className="left">
                      <span className="nm">High</span>
                      <span className="model">Coming soon</span>
                    </div>
                    <div className="blurb">
                      Best — near-human, expressive. High-end devices only.
                    </div>
                  </div>
                </div>
              </div>

              <div className="voice-picker">
                <div className="label">
                  <span>Voices</span>
                  <span className="sub">bundled · 4 · english</span>
                </div>
                <div className="voice-grid" aria-label="Default voice">
                  {VOICES.map((v) => {
                    const selected = v.id === voice;
                    const playing = previewVoice === v.id;
                    return (
                      <div
                        key={v.id}
                        className={selected ? "voice-chip on" : "voice-chip"}
                        data-testid={`voice-${v.id}`}
                      >
                        <button
                          type="button"
                          className="voice-pick-btn"
                          onClick={() => onChangeVoice(v.id)}
                          aria-label={`Select ${v.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "inherit",
                            font: "inherit",
                            textAlign: "left",
                            minWidth: 0,
                          }}
                        >
                          <span className="pick" aria-hidden="true" />
                          <span className="body">
                            <span className="nm">
                              {v.name}
                              <em>{v.suffix}</em>
                            </span>
                            <span className="desc">{v.desc}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={playing ? "preview playing" : "preview"}
                          onClick={() => onPreviewVoice(v.id)}
                          aria-label={`Preview ${v.id}`}
                          title="Preview"
                          disabled={!canPreview && !playing}
                          data-testid={`preview-${v.id}`}
                        >
                          {playing ? "❚❚" : "▶"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p
              style={{
                marginTop: 14,
                fontFamily: "'Archivo', sans-serif",
                fontStyle: "italic",
                fontSize: 12.5,
                lineHeight: 1.5,
                opacity: 0.7,
                position: "relative",
                zIndex: 1,
              }}
            >
              Changing the voice takes effect on the next <b>Read</b>. Audio you already saved keeps
              the voice it was recorded with.
            </p>
          </section>

          <section className="section" aria-label="Storage">
            <div className="section-head">
              <h3>Storage</h3>
              <span className="sub">everything on your device</span>
            </div>
            <div className="storage-row">
              <div className="storage-card">
                <div className="total">
                  {usedMb} mb<small>used · of ~{BUDGET_MB} mb soft budget</small>
                </div>
                <div className="vis">
                  <div className="seg-voice" style={{ width: `${voicePct}%` }} />
                  <div
                    className="seg-sessions"
                    style={{ left: `${voicePct}%`, width: `${sessionsPct}%` }}
                  />
                </div>
                <div className="legend">
                  <span>
                    <i className="i-voice" /> model · {MODEL_MB} mb
                  </span>
                  <span>
                    <i className="i-sessions" /> sessions · {sessionsMb} mb · {library.length} reads
                  </span>
                  <span>
                    <i className="i-free" /> free · {Math.max(0, BUDGET_MB - usedMb)} mb
                  </span>
                </div>
              </div>
              <div className="storage-actions">
                <h5>Clean up</h5>
                <div className="a-row">
                  <p>Remove sessions older than 30 days that you finished listening to.</p>
                  <button type="button" className="btn-small" disabled>
                    Sweep (soon)
                  </button>
                </div>
                <div className="a-row">
                  <p>Delete every saved session. The voice stays installed.</p>
                  <button
                    type="button"
                    className="btn-small danger"
                    onClick={onClearSessions}
                    disabled={library.length === 0}
                    data-testid="clear-sessions"
                  >
                    Clear sessions
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="section" aria-label="About">
            <div className="section-head">
              <h3>About</h3>
              <span className="sub">catm v0.1 · MMXXVI</span>
            </div>
            <div className="about-row">
              <div className="about-card">
                <b>Version</b>
                <div className="v">0.1.0-dev</div>
              </div>
              <div className="about-card">
                <b>License</b>
                <div className="v">MIT · open source</div>
              </div>
              <div className="about-card">
                <b>Source</b>
                <div className="v">
                  <a href="https://github.com/catm-app" target="_blank" rel="noopener noreferrer">
                    github.com/catm-app
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
