import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Container, Navbar, Nav } from "react-bootstrap";
import type { WaniKaniUser } from "../types";
import {
  getSettings,
  saveSettings,
  getWKCacheBuiltAt,
  getKanjiLevelStyle,
} from "../lib/storage";
import { getWaniKaniUser } from "../lib/wanikani";
import { effectiveLevelMode, type LevelMode, type KanjiLevelStyle } from "../lib/wkLevels";
import { useGeneration } from "../lib/generationContext";

const navItems = [
  { to: "/", label: "図書館", english: "Library", icon: "📚", exact: true },
  {
    to: "/generate",
    label: "生成",
    english: "Generate",
    icon: "✨",
    exact: false,
  },
  {
    to: "/settings",
    label: "設定",
    english: "Settings",
    icon: "⚙️",
    exact: false,
  },
  {
    to: "/whats-new",
    label: "更新情報",
    english: "What's New",
    icon: "📰",
    exact: false,
  },
];

export default function Layout() {
  const { status: generationStatus } = useGeneration();
  const isGenerating = generationStatus === "generating";
  const [wkUser, setWkUser] = useState<WaniKaniUser | null>(null);
  const [showGearPopup, setShowGearPopup] = useState(false);
  const [furigana, setFurigana] = useState(
    () => getSettings().showFurigana ?? true,
  );
  const [levelStyle, setLevelStyle] = useState<KanjiLevelStyle>(
    () => getKanjiLevelStyle(),
  );
  const [popupMode, setPopupMode] = useState(
    () => getSettings().wanikaniPopupMode ?? "advanced",
  );
  const [hasWkKey, setHasWkKey] = useState(
    () => !!getSettings().wanikaniApiKey,
  );
  const [wkCacheBuilt, setWkCacheBuilt] = useState(
    () => getWKCacheBuiltAt() != null,
  );
  const [distMode, setDistMode] = useState<LevelMode | undefined>(
    () => getSettings().levelDistributionMode,
  );
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const gearRef = useRef<HTMLDivElement>(null);
  const mobileGearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { wanikaniApiKey } = getSettings();
    if (!wanikaniApiKey) return;
    getWaniKaniUser(wanikaniApiKey)
      .then(setWkUser)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showGearPopup) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        gearRef.current && !gearRef.current.contains(e.target as Node) &&
        mobileGearRef.current && !mobileGearRef.current.contains(e.target as Node)
      ) {
        setShowGearPopup(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showGearPopup]);

  function openPopup() {
    const s = getSettings();
    setFurigana(s.showFurigana ?? true);
    setLevelStyle(getKanjiLevelStyle());
    setPopupMode(s.wanikaniPopupMode ?? "advanced");
    setHasWkKey(!!s.wanikaniApiKey);
    setWkCacheBuilt(getWKCacheBuiltAt() != null);
    setDistMode(s.levelDistributionMode);
    setShowGearPopup(true);
  }

  function handleDistMode(value: LevelMode) {
    saveSettings({ ...getSettings(), levelDistributionMode: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    setDistMode(value);
  }

  function handleFurigana(value: boolean) {
    saveSettings({ ...getSettings(), showFurigana: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    setFurigana(value);
  }

  function handleLevelStyle(value: KanjiLevelStyle) {
    saveSettings({ ...getSettings(), kanjiLevelStyle: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    setLevelStyle(value);
  }

  function handlePopupMode(value: "simple" | "advanced") {
    saveSettings({ ...getSettings(), wanikaniPopupMode: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    setPopupMode(value);
  }

  const gearPopupContent = showGearPopup && (
    <div
      className="position-absolute end-0 mt-1 p-3 rounded shadow"
      style={{
        top: "100%",
        minWidth: 260,
        zIndex: 1050,
        background: "var(--bs-body-bg)",
        border: "1px solid var(--bs-border-color)",
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex flex-column">
          <span style={{ fontSize: "0.85rem" }}>Furigana</span>
          <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
            Show reading aids above kanji
          </span>
        </div>
        <div className="form-check form-switch mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={furigana}
            onChange={(e) => handleFurigana(e.target.checked)}
          />
        </div>
      </div>
      <div
        className="mt-3 pt-3"
        style={{ borderTop: "1px solid var(--bs-border-color)" }}
      >
        <div className="d-flex flex-column">
          <div className="d-flex flex-column">
            <span style={{ fontSize: "0.85rem" }}>Level distribution</span>
            <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
              Kanji difficulty scale in story view
            </span>
          </div>
          {(() => {
            const wkKnowable = hasWkKey || wkCacheBuilt;
            const eff = effectiveLevelMode(distMode, wkKnowable);
            const segments: { value: LevelMode; label: string; enabled: boolean }[] = [
              { value: "jlpt", label: "JLPT", enabled: true },
              { value: "wanikani", label: "WK", enabled: wkKnowable },
            ];
            const other: LevelMode = eff === "jlpt" ? "wanikani" : "jlpt";
            const otherEnabled =
              segments.find((s) => s.value === other)?.enabled ?? false;
            return (
              <div
                role="button"
                onClick={() => otherEnabled && handleDistMode(other)}
                className="d-flex rounded-pill overflow-hidden mt-2 w-100"
                style={{
                  border: "1px solid var(--bs-border-color)",
                  cursor: otherEnabled ? "pointer" : "not-allowed",
                }}
              >
                {segments.map((seg) => {
                  const active = eff === seg.value;
                  return (
                    <div
                      key={seg.value}
                      className="px-3 py-1 flex-fill text-center"
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: active ? 600 : 400,
                        whiteSpace: "nowrap",
                        background: active
                          ? "var(--bs-primary)"
                          : "transparent",
                        color: active
                          ? "#fff"
                          : seg.enabled
                            ? "var(--bs-body-color)"
                            : "var(--bs-secondary-color)",
                        opacity: seg.enabled ? 1 : 0.45,
                      }}
                    >
                      {seg.label}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        {!hasWkKey && !wkCacheBuilt && (
          <div className="mt-2">
            <small className="text-secondary">
              <NavLink to="/settings" className="text-primary">
                Add a WaniKani key
              </NavLink>{" "}
              or build its cache to compare by WaniKani level.
            </small>
          </div>
        )}
        <div className="d-flex flex-column mt-3">
          <div className="d-flex flex-column">
            <span style={{ fontSize: "0.85rem" }}>Kanji levels</span>
            <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
              Mark kanji by difficulty level
            </span>
          </div>
          <div
            className="d-flex rounded-pill overflow-hidden mt-2 w-100"
            style={{ border: "1px solid var(--bs-border-color)" }}
          >
            {(
              [
                { value: "off", label: "Off" },
                { value: "highlight", label: "Highlight" },
                { value: "underline", label: "Underline" },
              ] as { value: KanjiLevelStyle; label: string }[]
            ).map((seg) => {
              const active = levelStyle === seg.value;
              return (
                <div
                  key={seg.value}
                  role="button"
                  onClick={() => !active && handleLevelStyle(seg.value)}
                  className="px-3 py-1 flex-fill text-center"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: active ? 600 : 400,
                    whiteSpace: "nowrap",
                    cursor: active ? "default" : "pointer",
                    background: active ? "var(--bs-primary)" : "transparent",
                    color: active ? "#fff" : "var(--bs-body-color)",
                  }}
                >
                  {seg.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div
        className="mt-3 pt-3"
        style={{ borderTop: "1px solid var(--bs-border-color)" }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            opacity: 0.5,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          WaniKani
        </span>
        {!hasWkKey && (
          <div className="mt-2 mb-2">
            <small className="text-secondary">
              <NavLink to="/settings" className="text-primary">
                Add WaniKani key
              </NavLink>
            </small>
          </div>
        )}
        <div style={!hasWkKey ? { opacity: 0.45, pointerEvents: "none" } : undefined}>
          <div className="d-flex align-items-center justify-content-between mt-2">
            <div className="d-flex flex-column">
              <span style={{ fontSize: "0.85rem" }}>
                Advanced popup
              </span>
              <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
                Shows WaniKani mnemonics; Simple is compact
              </span>
            </div>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                checked={hasWkKey && popupMode === "advanced"}
                disabled={!hasWkKey}
                onChange={(e) =>
                  handlePopupMode(
                    e.target.checked ? "advanced" : "simple",
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Desktop top navbar */}
      <Navbar
        className="navbar-dark-custom d-none d-md-flex sticky-top py-3"
        as="header"
      >
        <Container fluid="xl">
          <Navbar.Brand className="d-flex align-items-center gap-2 me-4">
            <span className="fs-4 fw-bold text-primary font-japanese">話</span>
            <span className="d-flex flex-column lh-1">
              <span className="fs-6 fw-semibold">日本語ストーリー</span>
              <span style={{ fontSize: "0.65em", opacity: 0.7 }}>
                Nihongo Story
              </span>
            </span>
          </Navbar.Brand>
          <Nav className="ms-auto">
            {navItems.map(({ to, label, english, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `nav-link font-japanese px-3 py-2 rounded ${isActive ? "nav-link-active" : "text-secondary"}`
                }
              >
                <span className="d-flex flex-column align-items-center lh-1">
                  <span className="d-flex align-items-center gap-1">
                    {label}
                    {to === "/generate" && isGenerating && (
                      <span
                        className="spinner-border spinner-border-sm text-primary"
                        style={{ width: "0.7rem", height: "0.7rem" }}
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span style={{ fontSize: "0.65em", opacity: 0.7 }}>
                    {english}
                  </span>
                </span>
              </NavLink>
            ))}
          </Nav>
          <div className="position-relative ms-3" ref={gearRef}>
            <button
              className="btn btn-link text-secondary p-2"
              onClick={
                showGearPopup ? () => setShowGearPopup(false) : openPopup
              }
              style={{ fontSize: "1.1rem", lineHeight: 1 }}
              title="Display settings"
            >
              <i className="bi bi-gear-fill" />
            </button>
            {gearPopupContent}
          </div>
          {wkUser && (
            <div className="d-flex align-items-center gap-2 ms-3">
              <div className="wk-avatar">
                {wkUser.username[0].toUpperCase()}
              </div>
              <div className="d-flex flex-column lh-1">
                <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                  {wkUser.username}
                </span>
                <span
                  className="text-secondary"
                  style={{ fontSize: "0.75rem" }}
                >
                  Lv. {wkUser.level}
                </span>
              </div>
            </div>
          )}
        </Container>
      </Navbar>

      {/* Mobile top bar */}
      <Navbar
        className="navbar-dark-custom d-md-none sticky-top py-2"
        as="header"
        expand={false}
        expanded={mobileNavExpanded}
        onToggle={setMobileNavExpanded}
      >
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center gap-2">
            <span className="fs-5 fw-bold text-primary font-japanese">話</span>
            <span className="d-flex flex-column lh-1">
              <span className="fw-semibold font-japanese">
                日本語ストーリー
              </span>
              <span style={{ fontSize: "0.65em", opacity: 0.7 }}>
                Nihongo Story
              </span>
            </span>
          </Navbar.Brand>
          <div
            className="position-relative me-1 ms-auto"
            ref={mobileGearRef}
          >
            <button
              className="btn btn-link text-secondary p-2"
              onClick={showGearPopup ? () => setShowGearPopup(false) : openPopup}
              style={{ fontSize: "1.1rem", lineHeight: 1 }}
              title="Display settings"
            >
              <i className="bi bi-gear-fill" />
            </button>
            {gearPopupContent}
          </div>
          <Navbar.Toggle
            aria-controls="mobile-nav-collapse"
            className="border-0 p-1"
          />
          <Navbar.Collapse id="mobile-nav-collapse">
            <Nav className="py-2 border-top mt-2">
              {wkUser && (
                <div className="d-flex align-items-center gap-2 px-2 py-2 border-bottom mb-2">
                  <div className="wk-avatar">
                    {wkUser.username[0].toUpperCase()}
                  </div>
                  <div className="d-flex flex-column lh-1">
                    <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                      {wkUser.username}
                    </span>
                    <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
                      Lv. {wkUser.level}
                    </span>
                  </div>
                </div>
              )}
              {navItems.map(({ to, label, english, icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={() => setMobileNavExpanded(false)}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center gap-3 px-2 py-2 rounded ${isActive ? "nav-link-active" : "text-secondary"}`
                  }
                >
                  <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
                  <span className="d-flex flex-column lh-1">
                    <span className="font-japanese d-flex align-items-center gap-1">
                      {label}
                      {to === "/generate" && isGenerating && (
                        <span
                          className="spinner-border spinner-border-sm text-primary"
                          style={{ width: "0.7rem", height: "0.7rem" }}
                          role="status"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span style={{ fontSize: "0.65em", opacity: 0.7 }}>{english}</span>
                  </span>
                </NavLink>
              ))}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main content */}
      <main className="flex-grow-1 overflow-y-auto pb-4">
        <Container style={{ maxWidth: 768 }} className="px-3 py-4">
          <Outlet />
        </Container>
      </main>

      {/* Footer */}
      <footer className="d-flex justify-content-center align-items-center py-3 border-top">
        <a
          href="https://github.com/Nauja/nihongo-story"
          target="_blank"
          rel="noopener noreferrer"
          className="d-flex align-items-center gap-2 text-secondary text-decoration-none"
          style={{ fontSize: "0.85rem" }}
        >
          <i className="bi bi-github fs-5" />
          <span>Nauja/nihongo-story</span>
        </a>
      </footer>

    </div>
  );
}
