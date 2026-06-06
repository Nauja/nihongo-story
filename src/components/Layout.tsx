import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Container, Navbar, Nav } from "react-bootstrap";
import type { WaniKaniUser } from "../types";
import { getSettings, saveSettings } from "../lib/storage";
import { getWaniKaniUser } from "../lib/wanikani";

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
];

export default function Layout() {
  const [wkUser, setWkUser] = useState<WaniKaniUser | null>(null);
  const [showGearPopup, setShowGearPopup] = useState(false);
  const [furigana, setFurigana] = useState(
    () => getSettings().showFurigana ?? true,
  );
  const [levelColors, setLevelColors] = useState(
    () => getSettings().wanikaniLevelColors ?? true,
  );
  const [popupMode, setPopupMode] = useState(
    () => getSettings().wanikaniPopupMode ?? "advanced",
  );
  const [hasWkKey, setHasWkKey] = useState(
    () => !!getSettings().wanikaniApiKey,
  );
  const gearRef = useRef<HTMLDivElement>(null);

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
      if (gearRef.current && !gearRef.current.contains(e.target as Node)) {
        setShowGearPopup(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showGearPopup]);

  function openPopup() {
    const s = getSettings();
    setFurigana(s.showFurigana ?? true);
    setLevelColors(s.wanikaniLevelColors ?? true);
    setPopupMode(s.wanikaniPopupMode ?? "advanced");
    setHasWkKey(!!s.wanikaniApiKey);
    setShowGearPopup(true);
  }

  function handleToggle(
    key: "showFurigana" | "wanikaniLevelColors",
    value: boolean,
  ) {
    saveSettings({ ...getSettings(), [key]: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    if (key === "showFurigana") setFurigana(value);
    else setLevelColors(value);
  }

  function handlePopupMode(value: "simple" | "advanced") {
    saveSettings({ ...getSettings(), wanikaniPopupMode: value });
    window.dispatchEvent(new CustomEvent("nihongo-settings-changed"));
    setPopupMode(value);
  }

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
                  <span>{label}</span>
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
            {showGearPopup && (
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
                      onChange={(e) =>
                        handleToggle("showFurigana", e.target.checked)
                      }
                    />
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
                  <div className="d-flex align-items-center justify-content-between mt-2 mb-2">
                    <div className="d-flex flex-column">
                      <span style={{ fontSize: "0.85rem" }}>Level colors</span>
                      <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>
                        Underline words by WaniKani level
                      </span>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={hasWkKey && levelColors}
                        disabled={!hasWkKey}
                        onChange={(e) =>
                          handleToggle("wanikaniLevelColors", e.target.checked)
                        }
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
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
            )}
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
      >
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center gap-2">
            <span className="fs-5 fw-bold text-primary font-japanese">話</span>
            <span className="d-flex flex-column lh-1">
              <span className="fw-semibold font-japanese">
                日本語ストーリー
              </span>
              <span style={{ fontSize: "0.65em", opacity: 0.7 }}>
                Nohingo Story
              </span>
            </span>
          </Navbar.Brand>
          {wkUser && (
            <div className="d-flex align-items-center gap-2 ms-auto">
              <div className="wk-avatar wk-avatar-sm">
                {wkUser.username[0].toUpperCase()}
              </div>
              <span className="fw-semibold" style={{ fontSize: "0.8rem" }}>
                Lv. {wkUser.level}
              </span>
            </div>
          )}
        </Container>
      </Navbar>

      {/* Main content */}
      <main className="flex-grow-1 overflow-y-auto pb-5 pb-md-4">
        <Container style={{ maxWidth: 768 }} className="px-3 py-4">
          <Outlet />
        </Container>
      </main>

      {/* Footer */}
      <footer className="d-none d-md-flex justify-content-center align-items-center py-3 border-top">
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

      {/* Mobile bottom nav */}
      <nav className="bottom-nav d-md-none">
        {navItems.map(({ to, label, english, icon, exact }) => (
          <NavLink key={to} to={to} end={exact}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{icon}</span>
            <span className="font-japanese">{label}</span>
            <span style={{ fontSize: "0.65em", opacity: 0.7 }}>{english}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
