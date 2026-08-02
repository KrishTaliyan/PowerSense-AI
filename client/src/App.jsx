import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const tabs = ["Dashboard", "Map", "Tickets", "Telemetry", "Simulation"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function statusTone(status) {
  if (status === "verified" || status === "closed") return "text-emerald-200 bg-emerald-950 border-emerald-800";
  if (status === "crew_assigned") return "text-sky-200 bg-sky-950 border-sky-800";
  if (status === "acknowledged") return "text-amber-200 bg-amber-950 border-amber-800";
  return "text-rose-200 bg-rose-950 border-rose-800";
}

function Metric({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border-zinc-800 bg-zinc-950",
    red: "border-rose-900 bg-rose-950/50",
    amber: "border-amber-900 bg-amber-950/50",
    green: "border-emerald-900 bg-emerald-950/50",
    teal: "border-teal-900 bg-teal-950/50",
  };

  return (
    <section className={cx("rounded-md border p-4", tones[tone])}>
      <p className="text-xs uppercase tracking-normal text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-50">{value ?? "-"}</p>
    </section>
  );
}

function ActionButton({ children, onClick, disabled, tone = "default" }) {
  const tones = {
    default: "bg-zinc-100 text-zinc-950 hover:bg-white",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
    warning: "bg-amber-400 text-zinc-950 hover:bg-amber-300",
    success: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
    quiet: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  };

  return (
    <button
      className={cx(
        "min-h-10 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone]
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SchematicMap({ poles, tickets }) {
  const bounds = useMemo(() => {
    if (!poles.length) return null;
    const lats = poles.map((pole) => pole.lat);
    const lons = poles.map((pole) => pole.lon);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
  }, [poles]);

  const positionedPoles = useMemo(() => {
    if (!bounds) return [];
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lonRange = bounds.maxLon - bounds.minLon || 1;

    return poles.map((pole) => ({
      ...pole,
      x: 5 + ((pole.lon - bounds.minLon) / lonRange) * 90,
      y: 95 - ((pole.lat - bounds.minLat) / latRange) * 90,
    }));
  }, [bounds, poles]);

  if (!poles.length) {
    return (
      <section className="flex aspect-[16/9] items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500">
        No pole data loaded
      </section>
    );
  }

  return (
    <section className="relative aspect-[16/9] overflow-hidden rounded-md border border-zinc-800 bg-[#181512]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px]" />
      {positionedPoles.map((pole) => (
        <div
          className={cx(
            "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border",
            !pole.device_id
              ? "border-zinc-600 bg-zinc-700"
              : pole.is_energized
                ? "border-emerald-300 bg-emerald-400"
                : "border-rose-200 bg-rose-500"
          )}
          key={pole.pole_id}
          style={{ left: `${pole.x}%`, top: `${pole.y}%` }}
          title={`${pole.pole_id} ${pole.is_energized ? "live" : "dark"}`}
        />
      ))}
      {tickets
        .filter((ticket) => ticket.lat && ticket.lon && !["verified", "closed"].includes(ticket.status))
        .map((ticket) => {
          if (!bounds) return null;
          const latRange = bounds.maxLat - bounds.minLat || 1;
          const lonRange = bounds.maxLon - bounds.minLon || 1;
          const x = 5 + ((ticket.lon - bounds.minLon) / lonRange) * 90;
          const y = 95 - ((ticket.lat - bounds.minLat) / latRange) * 90;

          return (
            <div
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-amber-100 bg-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.55)]"
              key={ticket.ticket_id}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${ticket.ticket_id} ${ticket.fault_type}`}
            />
          );
        })}
      <div className="absolute bottom-3 left-3 flex gap-2 text-xs text-zinc-200">
        <span className="rounded-sm bg-emerald-900 px-2 py-1">Live</span>
        <span className="rounded-sm bg-rose-900 px-2 py-1">Dark</span>
        <span className="rounded-sm bg-zinc-700 px-2 py-1">No device</span>
        <span className="rounded-sm bg-amber-700 px-2 py-1">Fault</span>
      </div>
    </section>
  );
}

function TicketTable({ tickets, onStatus }) {
  return (
    <section className="overflow-hidden rounded-md border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-950 text-left text-xs uppercase tracking-normal text-zinc-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Fault</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Affected</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-[#121212]">
            {tickets.map((ticket) => (
              <tr key={ticket.ticket_id}>
                <td className="px-4 py-3 font-medium text-zinc-100">{ticket.ticket_id}</td>
                <td className="px-4 py-3 text-zinc-300">{ticket.fault_type}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {ticket.localization_level} {ticket.pincode ? `- ${ticket.pincode}` : ""}
                </td>
                <td className="px-4 py-3 text-zinc-300">{ticket.affected_pole_count}</td>
                <td className="px-4 py-3 text-zinc-300">{Math.round(ticket.confidence * 100)}%</td>
                <td className="px-4 py-3">
                  <span className={cx("rounded-sm border px-2 py-1 text-xs", statusTone(ticket.status))}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[280px] flex-wrap gap-2">
                    <ActionButton tone="quiet" onClick={() => onStatus(ticket.ticket_id, "acknowledged")}>
                      Acknowledge
                    </ActionButton>
                    <ActionButton tone="quiet" onClick={() => onStatus(ticket.ticket_id, "crew_assigned")}>
                      Assign
                    </ActionButton>
                    <ActionButton tone="success" onClick={() => onStatus(ticket.ticket_id, "resolved")}>
                      Resolve
                    </ActionButton>
                    <ActionButton tone="default" onClick={() => onStatus(ticket.ticket_id, "closed")}>
                      Close
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
            {!tickets.length && (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan="7">
                  No tickets yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [transformers, setTransformers] = useState([]);
  const [poles, setPoles] = useState([]);
  const [selectedDt, setSelectedDt] = useState("");
  const [fromSeq, setFromSeq] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const tickets = dashboard?.tickets || [];
  const recentTelemetry = dashboard?.recent_telemetry || [];
  const stats = dashboard?.stats || {};

  const selectedTransformer = transformers.find((transformer) => transformer.dt_id === selectedDt);
  const feederId = selectedTransformer?.feeder_id || transformers[0]?.feeder_id || "";

  const refresh = useCallback(async () => {
    try {
      const [dashboardRes, transformerRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/transformers`),
      ]);

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

      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [selectedDt]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
    }, 0);
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function post(path, body = {}) {
    setBusy(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Request failed");

      const ticketCount = data.tickets?.length || 0;
      const verifiedCount = data.verified?.length || 0;
      setNotice(
        `${path.replace("/simulate/", "").replace("-", " ")} complete: ${
          data.telemetry_count ?? 0
        } telemetry messages, ${ticketCount} tickets, ${verifiedCount} verified`
      );
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
      const response = await fetch(`${API_BASE}/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Status update failed");

      setNotice(`${ticketId} is now ${data.status}`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#10100f] text-zinc-100">
      <header className="border-b border-zinc-800 bg-[#151412]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-teal-300">Karnataka State Power Distribution Board</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-50">PowerSense AI Operator Console</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                className={cx(
                  "rounded-md border px-3 py-2 text-sm transition",
                  activeTab === tab
                    ? "border-teal-500 bg-teal-500 text-zinc-950"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5">
        {(error || notice) && (
          <div
            className={cx(
              "mb-4 rounded-md border px-4 py-3 text-sm",
              error
                ? "border-rose-800 bg-rose-950 text-rose-100"
                : "border-emerald-800 bg-emerald-950 text-emerald-100"
            )}
          >
            {error || notice}
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Active Faults" value={stats.active_faults} tone="red" />
          <Metric label="Critical Faults" value={stats.critical_faults} tone="amber" />
          <Metric label="Devices Offline" value={stats.devices_offline} />
          <Metric label="Dark Poles" value={stats.affected_poles} tone="red" />
          <Metric label="Transformers" value={stats.transformers} tone="teal" />
          <Metric label="Avg Restore" value={stats.average_resolution_minutes ?? "Pending"} tone="green" />
        </section>

        <section className="mb-5 grid gap-3 rounded-md border border-zinc-800 bg-[#151412] p-4 md:grid-cols-[1fr_120px_1fr]">
          <label className="text-sm text-zinc-300">
            Transformer
            <select
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              onChange={(event) => setSelectedDt(event.target.value)}
              value={selectedDt}
            >
              {transformers.map((transformer) => (
                <option key={transformer.dt_id} value={transformer.dt_id}>
                  {transformer.dt_id} - {transformer.feeder_id} - {transformer.has_known_topology ? "known" : "estimated"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            Span
            <input
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              min="1"
              onChange={(event) => setFromSeq(Number(event.target.value))}
              type="number"
              value={fromSeq}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <ActionButton disabled={busy} onClick={() => post("/simulate/span-fault", { dt_id: selectedDt, from_seq: fromSeq })} tone="danger">
              Span fault
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => post("/simulate/transformer-fault", { dt_id: selectedDt })} tone="warning">
              DT fault
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => post("/simulate/feeder-fault", { feeder_id: feederId })} tone="warning">
              Feeder fault
            </ActionButton>
            <ActionButton disabled={busy} onClick={() => post("/simulate/repair", { dt_id: selectedDt, from_seq: fromSeq })} tone="success">
              Repair span
            </ActionButton>
            <ActionButton disabled={busy} onClick={refresh} tone="quiet">
              Refresh
            </ActionButton>
          </div>
        </section>

        {activeTab === "Dashboard" && (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section>
              <h2 className="mb-3 text-lg font-semibold">Active Incident Map</h2>
              <SchematicMap poles={poles} tickets={tickets} />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Latest Incidents</h2>
              <div className="space-y-3">
                {tickets.slice(0, 5).map((ticket) => (
                  <article className="rounded-md border border-zinc-800 bg-[#151412] p-4" key={ticket.ticket_id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-50">{ticket.ticket_id}</p>
                        <p className="mt-1 text-sm text-zinc-400">{ticket.ai_summary || ticket.confidence_reason}</p>
                      </div>
                      <span className={cx("shrink-0 rounded-sm border px-2 py-1 text-xs", statusTone(ticket.status))}>
                        {ticket.status}
                      </span>
                    </div>
                  </article>
                ))}
                {!tickets.length && <p className="rounded-md border border-zinc-800 p-4 text-zinc-500">No incidents detected.</p>}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Map" && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Pole-Level View</h2>
            <SchematicMap poles={poles} tickets={tickets} />
          </section>
        )}

        {activeTab === "Tickets" && <TicketTable tickets={tickets} onStatus={updateTicketStatus} />}

        {activeTab === "Telemetry" && (
          <section className="overflow-hidden rounded-md border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-zinc-950 text-left text-xs uppercase tracking-normal text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Pole</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Seq</th>
                    <th className="px-4 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-[#121212]">
                  {recentTelemetry.map((row) => (
                    <tr key={row._id}>
                      <td className="px-4 py-3 text-zinc-300">{formatTime(row.received_at)}</td>
                      <td className="px-4 py-3 font-medium text-zinc-100">{row.pole_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.event}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.energized ? "live" : "dark"}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.seq}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.is_duplicate ? "duplicate" : row.is_stale ? "stale" : "clean"}
                      </td>
                    </tr>
                  ))}
                  {!recentTelemetry.length && (
                    <tr>
                      <td className="px-4 py-8 text-center text-zinc-500" colSpan="6">
                        No telemetry yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "Simulation" && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-zinc-800 bg-[#151412] p-4">
              <h2 className="text-lg font-semibold">Faults</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton disabled={busy} onClick={() => post("/simulate/span-fault", { dt_id: selectedDt, from_seq: fromSeq })} tone="danger">
                  Inject span fault
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/transformer-fault", { dt_id: selectedDt })} tone="warning">
                  Inject DT fault
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/feeder-fault", { feeder_id: feederId })} tone="warning">
                  Inject feeder fault
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/repair", { dt_id: selectedDt, from_seq: fromSeq })} tone="success">
                  Repair selected span
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/repair", { scope: "transformer", dt_id: selectedDt })} tone="success">
                  Repair DT
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/repair", { scope: "feeder", feeder_id: feederId })} tone="success">
                  Repair feeder
                </ActionButton>
              </div>
            </div>
            <div className="rounded-md border border-zinc-800 bg-[#151412] p-4">
              <h2 className="text-lg font-semibold">Noise</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton disabled={busy} onClick={() => post("/simulate/scheduled-outage", { dt_id: selectedDt })} tone="quiet">
                  Scheduled outage
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/kill-device")} tone="quiet">
                  Kill device
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/duplicate-message")} tone="quiet">
                  Duplicate packet
                </ActionButton>
                <ActionButton disabled={busy} onClick={() => post("/simulate/delayed-message")} tone="quiet">
                  Delayed packet
                </ActionButton>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
