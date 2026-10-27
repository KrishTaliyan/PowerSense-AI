import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import CommandPalette from "./components/CommandPalette.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Icon from "./components/Icon.jsx";
import { PageSkeleton } from "./components/PageState.jsx";
import ProductTour from "./components/ProductTour.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import TicketDrawer from "./components/TicketDrawer.jsx";
import { navigation } from "./constants.js";
import { apiRequest } from "./utils/api.js";
import { cx, formatRelative, readableError, statusLabel } from "./utils/format.js";

// Pages load on demand so the first paint only needs the shell, not Leaflet and every view.
const pageLoaders = {
  overview: () => import("./pages/OverviewPage.jsx"),
  map: () => import("./pages/MapPage.jsx"),
  tickets: () => import("./pages/TicketsPage.jsx"),
  telemetry: () => import("./pages/TelemetryPage.jsx"),
  simulation: () => import("./pages/SimulationPage.jsx"),
  leaflet: () => import("./components/SchematicMap.jsx"),
};
const OverviewPage = lazy(pageLoaders.overview);
const MapPage = lazy(pageLoaders.map);
const TicketsPage = lazy(pageLoaders.tickets);
const TelemetryPage = lazy(pageLoaders.telemetry);
const SimulationPage = lazy(pageLoaders.simulation);

// Once the first view is up, warm the other chunks so switching tabs never shows a loader.
function prefetchPages() {
  const run = () => Object.values(pageLoaders).forEach((load) => { load().catch(() => {}); });
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 1500);
}

const POLL_INTERVAL_MS = 5000;
const SLOW_START_MS = 3500;

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Preferences are a convenience; the console works without storage.
  }
}

function initialTheme() {
  const fromDocument = document.documentElement.dataset.theme;
  if (fromDocument === "light" || fromDocument === "dark") return fromDocument;
  return readStorage("powersense-theme") === "light" ? "light" : "dark";
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [transformers, setTransformers] = useState([]);
  const [poles, setPoles] = useState([]);
  const [selectedDt, setSelectedDt] = useState("");
  const fromSeq = 5;
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedPole, setSelectedPole] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [slowStart, setSlowStart] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => readStorage("powersense-tour-complete") !== "true");
  const [theme, setTheme] = useState(initialTheme);
  const selectedDtRef = useRef(selectedDt);
  const loadedPolesDtRef = useRef("");

  const ticketsData = dashboard?.tickets;
  const tickets = useMemo(() => ticketsData || [], [ticketsData]);
  const recentTelemetryData = dashboard?.recent_telemetry;
  const recentTelemetry = useMemo(() => recentTelemetryData || [], [recentTelemetryData]);
  const stats = dashboard?.stats || {};
  const activeTickets = useMemo(() => tickets.filter((ticket) => !["verified", "closed"].includes(ticket.status)), [tickets]);
  const selectedTicketForDrawer = selectedTicket
    ? tickets.find((ticket) => ticket.ticket_id === selectedTicket.ticket_id) || selectedTicket
    : null;
  const selectedTransformer = transformers.find((transformer) => transformer.dt_id === selectedDt);
  const feederId = selectedTransformer?.feeder_id || transformers[0]?.feeder_id || "";
  const cleanPackets = recentTelemetry.filter((row) => !row.is_duplicate && !row.is_stale).length;
  const signalContinuity = recentTelemetry.length ? Math.round((cleanPackets / recentTelemetry.length) * 100) : 100;
  const isOnline = Boolean(lastSync) && !loadError;
  const activeNav = navigation.find((item) => item.id === activeTab);

  const loadPoles = useCallback(async (dtId) => {
    if (!dtId) return;
    // Marked before the request resolves so the selection effect doesn't fetch the same slice twice.
    loadedPolesDtRef.current = dtId;
    const data = await apiRequest(`/poles?dt_id=${encodeURIComponent(dtId)}&limit=800`);
    if (selectedDtRef.current === dtId) setPoles(data);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const knownDt = selectedDtRef.current;
      // When the transformer is already known, the pole slice loads alongside the dashboard instead of after it.
      const [dashboardData, transformerData] = await Promise.all([
        apiRequest("/dashboard"),
        apiRequest("/transformers"),
        knownDt ? loadPoles(knownDt) : null,
      ]);
      setDashboard(dashboardData);
      setTransformers(transformerData);
      if (!knownDt && transformerData[0]?.dt_id) {
        selectedDtRef.current = transformerData[0].dt_id;
        setSelectedDt(transformerData[0].dt_id);
        await loadPoles(transformerData[0].dt_id);
      }
      setLastSync(new Date());
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setInitialLoading(false);
      setSlowStart(false);
    }
  }, [loadPoles]);

  // Changing transformer swaps the map slice right away rather than waiting for the next poll.
  useEffect(() => {
    selectedDtRef.current = selectedDt;
    if (selectedDt && loadedPolesDtRef.current !== selectedDt) {
      loadPoles(selectedDt).catch((err) => setLoadError(err.message));
    }
  }, [loadPoles, selectedDt]);

  useEffect(() => {
    if (!initialLoading) prefetchPages();
  }, [initialLoading]);

  useEffect(() => {
    const slowTimer = window.setTimeout(() => setSlowStart(true), SLOW_START_MS);
    const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => {
      // Hidden tabs don't need live polling; they catch up when shown again.
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setSettingsOpen(false);
        setNavOpen(false);
        setSelectedTicket(null);
        return;
      }
      if (commandOpen || settingsOpen || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const index = Number(event.key) - 1;
      if (navigation[index]) setActiveTab(navigation[index].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, settingsOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f5f6f8" : "#0a0c10");
    writeStorage("powersense-theme", theme);
  }, [theme]);

  // Auto-dismiss toasts; errors stay longer since they usually need reading.
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), toast.type === "error" ? 6000 : 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function post(path, body = {}, label = "Scenario") {
    setBusy(true);
    setToast(null);
    try {
      const data = await apiRequest(path, { method: "POST", body, timeoutMs: 60000 });
      const ticketCount = data.tickets?.length || 0;
      const verifiedCount = data.verified?.length || 0;
      setToast({
        type: "success",
        title: `${label} complete`,
        message: `${data.telemetry_count ?? 0} packets · ${ticketCount} incident${ticketCount === 1 ? "" : "s"}${verifiedCount ? ` · ${verifiedCount} verified` : ""}`,
      });
      await refresh();
    } catch (err) {
      setToast({ type: "error", title: `${label} failed`, message: readableError(err.message) });
    } finally {
      setBusy(false);
    }
  }

  async function updateTicketStatus(ticketId, status) {
    setBusy(true);
    setToast(null);
    try {
      const data = await apiRequest(`/tickets/${ticketId}/status`, { method: "PATCH", body: { status } });
      setSelectedTicket((ticket) => ticket?.ticket_id === ticketId ? { ...ticket, ...data } : ticket);
      if (data.blocked) {
        setToast({ type: "error", title: "Action needs attention", message: readableError(data.message || "This action needs more telemetry before it can be completed.") });
      } else {
        setToast({ type: "success", title: "Incident updated", message: `${ticketId} is now ${statusLabel(data.status)}` });
      }
      await refresh();
    } catch (err) {
      setToast({ type: "error", title: "Update failed", message: readableError(err.message) });
    } finally {
      setBusy(false);
    }
  }

  const jumpTo = useCallback((tab) => {
    setActiveTab(tab);
    setCommandOpen(false);
    setNavOpen(false);
  }, []);

  const changeTransformer = useCallback((dtId) => {
    setSelectedDt(dtId);
    setSelectedPole(null);
  }, []);

  const selectTicket = useCallback((ticket) => {
    setSelectedTicket(ticket);
    if (ticket?.dt_id) setSelectedDt(ticket.dt_id);
  }, []);

  const selectTransformer = useCallback((transformer) => {
    changeTransformer(transformer.dt_id);
    setActiveTab("Map");
  }, [changeTransformer]);

  const selectPoleFromCommand = useCallback((pole) => {
    if (pole.dt_id) setSelectedDt(pole.dt_id);
    setSelectedPole(pole);
    setActiveTab("Map");
  }, []);

  function restartTour() {
    writeStorage("powersense-tour-complete", null);
    setSettingsOpen(false);
    setTourOpen(true);
  }

  function renderContent() {
    const shared = { error: loadError, loading: initialLoading, refresh };

    if (activeTab === "Map") {
      return (
        <MapPage
          {...shared}
          focusTicket={selectedTicketForDrawer}
          poles={poles}
          selectTicket={selectTicket}
          selectedPole={selectedPole}
          selectedTransformer={selectedTransformer}
          setSelectedPole={setSelectedPole}
          theme={theme}
          tickets={tickets}
        />
      );
    }

    if (activeTab === "Tickets") {
      return <TicketsPage {...shared} activeTickets={activeTickets} busy={busy} selectTicket={selectTicket} tickets={tickets} updateTicketStatus={updateTicketStatus} />;
    }

    if (activeTab === "Telemetry") {
      return <TelemetryPage {...shared} recentTelemetry={recentTelemetry} signalContinuity={signalContinuity} />;
    }

    if (activeTab === "Simulation") {
      return <SimulationPage {...shared} busy={busy} feederId={feederId} fromSeq={fromSeq} post={post} selectedDt={selectedDt} selectedTransformer={selectedTransformer} />;
    }

    return (
      <OverviewPage
        {...shared}
        activeTickets={activeTickets}
        changeTransformer={changeTransformer}
        focusMode={focusMode}
        jumpTo={jumpTo}
        lastSync={lastSync}
        poles={poles}
        recentTelemetry={recentTelemetry}
        selectTicket={selectTicket}
        selectedPole={selectedPole}
        selectedTransformer={selectedTransformer}
        setFocusMode={setFocusMode}
        setSelectedPole={setSelectedPole}
        signalContinuity={signalContinuity}
        stats={stats}
        theme={theme}
        tickets={tickets}
        transformers={transformers}
      />
    );
  }

  return (
    <div className={cx("app-shell", focusMode && "focus-mode", navOpen && "nav-open")}>
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brand-mark"><Icon name="bolt" size={17} /></span>
          <div><strong>PowerSense <em>AI</em></strong><span>Grid operations</span></div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setNavOpen(false)} type="button"><Icon name="close" size={16} /></button>
        </div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="side-nav" data-tour="shortcuts">
          {navigation.map((item, index) => (
            <button aria-current={activeTab === item.id ? "page" : undefined} className={cx("nav-item", activeTab === item.id && "nav-active")} key={item.id} onClick={() => jumpTo(item.id)} type="button">
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span className="nav-label">{item.label}</span>
              {item.id === "Tickets" && activeTickets.length > 0 && <b className="nav-badge">{activeTickets.length}</b>}
              <kbd>{index + 1}</kbd>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className={cx("network-status", isOnline ? "status-online" : initialLoading ? "status-connecting" : "status-offline")}>
          <div className="status-heading"><span className="status-indicator" />API connection</div>
          <strong>{isOnline ? "Connected" : initialLoading ? "Connecting…" : "Unavailable"}</strong>
          <span>{isOnline ? `Last sync ${formatRelative(lastSync)} · every ${POLL_INTERVAL_MS / 1000}s` : initialLoading ? "Loading network state" : "Retrying automatically"}</span>
        </div>
        <div className="sidebar-footer">
          <button className="operator-chip" onClick={() => setSettingsOpen(true)} type="button">
            <span className="avatar">OP</span>
            <span><strong>Control room</strong><small>Operator console</small></span>
            <Icon name="settings" size={15} />
          </button>
        </div>
      </aside>
      <div className="nav-scrim" onClick={() => setNavOpen(false)} role="presentation" />

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setNavOpen(true)} type="button"><Icon name="menu" size={18} /></button>
            <div className="breadcrumbs"><span>PowerSense</span><Icon name="chevronRight" size={14} /><strong>{activeNav?.label}</strong></div>
          </div>
          <div className="topbar-actions">
            <button className="command-button" data-tour="quick-actions" onClick={() => setCommandOpen(true)} type="button">
              <Icon name="search" size={15} /><span>Search or run a command…</span><kbd>Ctrl K</kbd>
            </button>
            <div className={cx("sync-status", !isOnline && !initialLoading && "sync-offline")} title={lastSync ? `Last synced ${lastSync.toLocaleTimeString()}` : undefined}>
              <span className="status-indicator" />{isOnline ? "Live" : initialLoading ? "Connecting" : "Offline"}
            </div>
            <span className="topbar-divider" />
            <button aria-pressed={focusMode} className={cx("focus-button", focusMode && "focus-enabled")} data-tour="focus-mode" onClick={() => setFocusMode((mode) => !mode)} title="Focus mode" type="button"><Icon name="target" size={16} /><span>Focus</span></button>
            <button className="icon-button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} title="Toggle theme" type="button"><Icon name={theme === "dark" ? "sun" : "moon"} size={16} /></button>
            <button className="icon-button" aria-label="Start product tour" data-tour="tour-launch" onClick={restartTour} title="Product tour" type="button"><Icon name="help" size={16} /></button>
            <button className="icon-button hide-sm" aria-label="Open settings" onClick={() => setSettingsOpen(true)} title="Settings" type="button"><Icon name="settings" size={16} /></button>
            <button className="icon-button hide-sm" aria-label="Refresh data" onClick={refresh} title="Refresh" type="button"><Icon name="refresh" size={16} /></button>
          </div>
        </header>

        {slowStart && initialLoading && (
          <div className="connection-banner" role="status">
            <Icon name="clock" size={15} />
            <span>Waking up the API server. Hosted instances can take up to a minute on the first request.</span>
          </div>
        )}
        {!initialLoading && loadError && (
          <div className="connection-banner connection-error" role="alert">
            <Icon name="alert" size={15} />
            <span>{readableError(loadError)}{lastSync ? ` Showing data from ${formatRelative(lastSync)}.` : ""}</span>
            <button onClick={refresh} type="button">Retry</button>
          </div>
        )}

        <main className="content-area">
          {toast && (
            <div className={cx("toast", toast.type === "error" ? "toast-error" : "toast-success")} role="status">
              <span className="toast-icon"><Icon name={toast.type === "error" ? "alert" : "check"} size={16} /></span>
              <div className="toast-copy"><strong>{toast.title}</strong><span>{toast.message}</span></div>
              <button aria-label="Dismiss message" onClick={() => setToast(null)} type="button"><Icon name="close" size={14} /></button>
            </div>
          )}
          <ErrorBoundary key={activeTab} page>
            <Suspense fallback={<PageSkeleton rows={4} />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </section>

      {selectedTicketForDrawer && <TicketDrawer busy={busy} onClose={() => setSelectedTicket(null)} onStatus={updateTicketStatus} ticket={selectedTicketForDrawer} />}
      {commandOpen && (
        <CommandPalette
          onAction={(action) => { if (action === "span") post("/simulate/span-fault", { dt_id: selectedDt, from_seq: fromSeq }, "Span fault"); }}
          onClose={() => setCommandOpen(false)}
          onNavigate={jumpTo}
          onSelectPole={selectPoleFromCommand}
          onSelectTicket={selectTicket}
          onSelectTransformer={selectTransformer}
          poles={poles}
          tickets={tickets}
          transformers={transformers}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onRestartTour={restartTour} setTheme={setTheme} theme={theme} />}
      <ProductTour active={tourOpen} onClose={() => setTourOpen(false)} onNavigate={jumpTo} />
    </div>
  );
}

export default App;
