import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import CommandPalette from "./components/CommandPalette.jsx";
import Icon from "./components/Icon.jsx";
import ProductTour from "./components/ProductTour.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import TicketDrawer from "./components/TicketDrawer.jsx";
import { API_BASE, navigation } from "./constants.js";
import MapPage from "./pages/MapPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import SimulationPage from "./pages/SimulationPage.jsx";
import TelemetryPage from "./pages/TelemetryPage.jsx";
import TicketsPage from "./pages/TicketsPage.jsx";
import { cx, formatTime, readableError, statusLabel } from "./utils/format.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("powersense-tour-complete") !== "true";
    } catch {
      return false;
    }
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("powersense-theme") || "dark";
  });

  const ticketsData = dashboard?.tickets;
  const tickets = useMemo(() => ticketsData || [], [ticketsData]);
  const recentTelemetryData = dashboard?.recent_telemetry;
  const recentTelemetry = useMemo(() => recentTelemetryData || [], [recentTelemetryData]);
  const stats = dashboard?.stats || {};
  const activeTickets = tickets.filter((ticket) => !["verified", "closed"].includes(ticket.status));
  const selectedTicketForDrawer = selectedTicket
    ? tickets.find((ticket) => ticket.ticket_id === selectedTicket.ticket_id) || selectedTicket
    : null;
  const selectedTransformer = transformers.find((transformer) => transformer.dt_id === selectedDt);
  const feederId = selectedTransformer?.feeder_id || transformers[0]?.feeder_id || "";
  const cleanPackets = recentTelemetry.filter((row) => !row.is_duplicate && !row.is_stale).length;
  const signalContinuity = recentTelemetry.length ? Math.round((cleanPackets / recentTelemetry.length) * 100) : 100;
  const telemetryTrend = useMemo(() => recentTelemetry.slice().reverse().map((row) => row.energized ? 76 + (row.seq % 16) : 28 + (row.seq % 10)), [recentTelemetry]);

  const refresh = useCallback(async () => {
    try {
      const [dashboardRes, transformerRes] = await Promise.all([fetch(`${API_BASE}/dashboard`), fetch(`${API_BASE}/transformers`)]);
      if (!dashboardRes.ok || !transformerRes.ok) throw new Error("Backend is not responding");
      const dashboardData = await dashboardRes.json();
      const transformerData = await transformerRes.json();
      const nextSelectedDt = selectedDt || transformerData[0]?.dt_id || "";
      setDashboard(dashboardData);
      setTransformers(transformerData);
      setSelectedDt(nextSelectedDt);
      if (nextSelectedDt) {
        const polesRes = await fetch(`${API_BASE}/poles?dt_id=${encodeURIComponent(nextSelectedDt)}&limit=800`);
        if (polesRes.ok) setPoles(await polesRes.json());
      }
      setLastSync(new Date());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedDt]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setSelectedTicket(null);
      }
      if (!commandOpen && !event.metaKey && !event.ctrlKey && ["1", "2", "3", "4", "5"].includes(event.key)) {
        setActiveTab(navigation[Number(event.key) - 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("powersense-theme", theme);
  }, [theme]);

  // Auto-dismiss the toast so operators don't have to close it manually.
  // Errors stay a little longer than success notices since they usually need reading.
  useEffect(() => {
    if (!notice && !error) return undefined;
    const timeout = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, error ? 6000 : 4000);
    return () => window.clearTimeout(timeout);
  }, [notice, error]);

  async function post(path, body = {}, label = "Scenario") {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Request failed");
      const ticketCount = data.tickets?.length || 0;
      const verifiedCount = data.verified?.length || 0;
      setNotice(`${label} complete - ${data.telemetry_count ?? 0} packets - ${ticketCount} incident${ticketCount === 1 ? "" : "s"}${verifiedCount ? ` - ${verifiedCount} verified` : ""}`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateTicketStatus(ticketId, status) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Status update failed");
      if (data.blocked) {
        setSelectedTicket((ticket) => ticket?.ticket_id === ticketId ? { ...ticket, ...data } : ticket);
        await refresh();
        setError(data.message || "This action needs more telemetry before it can be completed.");
        return;
      }
      setNotice(`${ticketId} is now ${statusLabel(data.status)}`);
      setSelectedTicket((ticket) => ticket?.ticket_id === ticketId ? { ...ticket, ...data } : ticket);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const jumpTo = useCallback((tab) => {
    setActiveTab(tab);
    setCommandOpen(false);
  }, []);

  const selectTicket = useCallback((ticket) => {
    setSelectedTicket(ticket);
    if (ticket?.dt_id) setSelectedDt(ticket.dt_id);
  }, []);

  const selectTransformer = useCallback((transformer) => {
    setSelectedDt(transformer.dt_id);
    setSelectedPole(null);
    setActiveTab("Map");
  }, []);

  const selectPoleFromCommand = useCallback((pole) => {
    if (pole.dt_id) setSelectedDt(pole.dt_id);
    setSelectedPole(pole);
    setActiveTab("Map");
  }, []);

  function restartTour() {
    try {
      window.localStorage.removeItem("powersense-tour-complete");
    } catch {
      // The tour can still run for the current session when storage is unavailable.
    }
    setSettingsOpen(false);
    setTourOpen(true);
  }

  function renderContent() {
    if (activeTab === "Map") {
      return (
        <MapPage
          poles={poles}
          refresh={refresh}
          error={error}
          loading={initialLoading}
          selectedPole={selectedPole}
          focusTicket={selectedTicketForDrawer}
          selectedTransformer={selectedTransformer}
          selectTicket={selectTicket}
          setSelectedPole={setSelectedPole}
          tickets={tickets}
        />
      );
    }

    if (activeTab === "Tickets") {
      return <TicketsPage activeTickets={activeTickets} error={error} loading={initialLoading} refresh={refresh} selectTicket={selectTicket} tickets={tickets} updateTicketStatus={updateTicketStatus} />;
    }

    if (activeTab === "Telemetry") {
      return <TelemetryPage error={error} loading={initialLoading} recentTelemetry={recentTelemetry} refresh={refresh} signalContinuity={signalContinuity} />;
    }

    if (activeTab === "Simulation") {
      return <SimulationPage busy={busy} error={error} feederId={feederId} fromSeq={fromSeq} loading={initialLoading} post={post} refresh={refresh} selectedDt={selectedDt} />;
    }

    return (
      <OverviewPage
        activeTickets={activeTickets}
        error={error}
        focusMode={focusMode}
        jumpTo={jumpTo}
        lastSync={lastSync}
        loading={initialLoading}
        poles={poles}
        refresh={refresh}
        selectTicket={selectTicket}
        selectedPole={selectedPole}
        selectedTransformer={selectedTransformer}
        setFocusMode={setFocusMode}
        setSelectedDt={setSelectedDt}
        setSelectedPole={setSelectedPole}
        signalContinuity={signalContinuity}
        stats={stats}
        telemetryTrend={telemetryTrend}
        tickets={tickets}
        transformers={transformers}
      />
    );
  }

  return (
    <div className={cx("app-shell", focusMode && "focus-mode", theme === "light" && "light-theme")}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="bolt" size={18} /></span><div><strong>PowerSense</strong><span>OUTAGE INTELLIGENCE</span></div></div>
        <div className="sidebar-section-label">Main views</div>
        <nav className="side-nav" data-tour="shortcuts">
          {navigation.map((item, index) => (
            <button className={cx("nav-item", activeTab === item.id && "nav-active")} key={item.id} onClick={() => setActiveTab(item.id)} type="button">
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span>{item.label}</span>
              {item.id === "Tickets" && activeTickets.length > 0 && <b>{activeTickets.length}</b>}
              <kbd>{index + 1}</kbd>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="network-status"><div className="status-heading"><span className="live-dot" />Connection status</div><strong>Everything is running</strong><span>Live device connection - 42ms</span><div className="status-bar"><i /></div></div>
        <div className="sidebar-footer"><button className="operator-chip" onClick={() => setSettingsOpen(true)} type="button"><span className="avatar">OP</span><span><strong>Control room</strong><small>Settings available</small></span><span className="online-dot" /></button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs"><span>PowerSense</span><Icon name="arrow" size={13} /><strong>{navigation.find((item) => item.id === activeTab)?.label}</strong></div>
          <div className="topbar-actions">
            <button className="command-button" data-tour="quick-actions" onClick={() => setCommandOpen(true)} type="button"><Icon name="command" size={16} /><span>Quick actions</span><kbd>Ctrl K</kbd></button>
            <div className="sync-status"><span className="live-dot" />Live <span className="sync-time">{lastSync ? formatTime(lastSync) : "-"}</span></div>
            <button className={cx("focus-button", focusMode && "focus-enabled")} data-tour="focus-mode" onClick={() => setFocusMode((mode) => !mode)} type="button"><Icon name="target" size={16} />{focusMode ? "Focus on" : "Focus mode"}</button>
            <button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} type="button"><Icon name={theme === "dark" ? "sun" : "moon"} size={16} /><span>{theme === "dark" ? "Light" : "Dark"}</span></button>
            <button className="tour-launch-button" data-tour="tour-launch" onClick={restartTour} type="button"><Icon name="help" size={16} /><span>Tour</span></button>
            <button className="icon-button" aria-label="Open settings" onClick={() => setSettingsOpen(true)} type="button"><Icon name="settings" size={17} /></button>
            <button className="icon-button" aria-label="Refresh data" onClick={refresh} type="button"><Icon name="refresh" size={17} /></button>
          </div>
        </header>
        <main className="content-area">
          {(error || notice) && (
            <div className={cx("toast", error ? "toast-error" : "toast-success")}>
              <span>{error ? <Icon name="alert" size={16} /> : <Icon name="check" size={16} />}</span>
              <div className="toast-copy"><strong>{error ? "Action needs attention" : "Update complete"}</strong><span>{error ? readableError(error) : notice}</span></div>
              <button aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }} type="button"><Icon name="close" size={15} /></button>
            </div>
          )}
          <ErrorBoundary key={activeTab}>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </section>

      {selectedTicketForDrawer && <TicketDrawer onClose={() => setSelectedTicket(null)} onStatus={updateTicketStatus} ticket={selectedTicketForDrawer} />}
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