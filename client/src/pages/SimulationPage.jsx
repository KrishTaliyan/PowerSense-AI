import { useEffect, useRef, useState } from "react";
import ActionButton from "../components/ActionButton.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";
import Icon from "../components/Icon.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import { cx } from "../utils/format.js";

const EXPECTED_DURATION_MS = 12000; // tune this to your typical real response time

export default function SimulationPage({ busy, error, feederId, fromSeq, loading, post, refresh, selectedDt }) {
  const [faultType, setFaultType] = useState("span");
  const [severity, setSeverity] = useState(55);
  const [noise, setNoise] = useState({ duplicate_packet: true, delayed_packet: false, kill_device: false });
  const [repairAfterFault, setRepairAfterFault] = useState(false);
  const [progress, setProgress] = useState(0);
  const wasBusyRef = useRef(false);

  useEffect(() => {
    if (busy) {
      wasBusyRef.current = true;
      const start = Date.now();
      setProgress(3);
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - start;
        // Approaches 92% asymptotically — never claims done until the response actually lands.
        const pct = 92 * (1 - Math.exp(-elapsed / EXPECTED_DURATION_MS));
        setProgress(Math.min(92, Math.round(pct)));
      }, 150);
      return () => window.clearInterval(interval);
    }

    if (wasBusyRef.current) {
      setProgress(100);
      const timeout = window.setTimeout(() => {
        setProgress(0);
        wasBusyRef.current = false;
      }, 600);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [busy]);

  const faultActions = [
    { title: "Span fault", description: "Break a single downstream span and localize the boundary.", icon: "bolt", variant: "danger", path: "/simulate/span-fault", body: { dt_id: selectedDt, from_seq: fromSeq } },
    { title: "Transformer outage", description: "Darken every observed pole behind one transformer.", icon: "shield", variant: "warning", path: "/simulate/transformer-fault", body: { dt_id: selectedDt } },
    { title: "Feeder outage", description: "Exercise wide-area grouping and criticality ranking.", icon: "radio", variant: "warning", path: "/simulate/feeder-fault", body: { feeder_id: feederId } },
  ];
  const noiseActions = [
    { title: "Scheduled outage", description: "Prove planned work does not create a false ticket.", icon: "clock", path: "/simulate/scheduled-outage", body: { dt_id: selectedDt } },
    { title: "Kill a device", description: "Separate a silent sensor from a genuinely dark pole.", icon: "satellite", path: "/simulate/kill-device", body: {} },
    { title: "Duplicate packet", description: "Quarantine the same sequence without changing pole state.", icon: "copy", path: "/simulate/duplicate-message", body: {} },
    { title: "Delayed packet", description: "Ignore old telemetry while retaining an audit trail.", icon: "radio", path: "/simulate/delayed-message", body: {} },
  ];
  const repairActions = [
    { title: "Restore span", description: "Send restoration telemetry for the selected segment.", icon: "wrench", body: { dt_id: selectedDt, from_seq: fromSeq } },
    { title: "Restore transformer", description: "Bring every pole behind the selected transformer live.", icon: "check", body: { scope: "transformer", dt_id: selectedDt } },
    { title: "Restore feeder", description: "Verify the wide-area restoration workflow.", icon: "check", body: { scope: "feeder", feeder_id: feederId } },
  ];

  const renderScenarioCard = (action, variant = "quiet", disabled = false) => (
    <button className={cx("scenario-card", variant === "quiet" && "scenario-muted")} disabled={busy || disabled} key={action.title} onClick={() => post(action.path || "/simulate/repair", action.body, action.title)} type="button">
      <span className={cx("scenario-icon", `scenario-${variant}`)}><Icon name={action.icon} size={19} /></span>
      <span><strong>{action.title}</strong><small>{action.description}</small></span>
      <Icon name="arrow" size={16} />
    </button>
  );

  function toggleNoise(key) {
    setNoise((current) => ({ ...current, [key]: !current[key] }));
  }

  function runConfiguredScenario() {
    post(
      "/simulate/configured",
      {
        dt_id: selectedDt,
        feeder_id: feederId,
        fault_type: faultType,
        severity,
        noise,
        repair_after_fault: repairAfterFault,
      },
      "Configured simulation",
    );
  }

  if (loading) return <PageSkeleton rows={3} />;
  if (error && !selectedDt) return <ErrorState detail={error} onRetry={refresh} title="Scenario lab could not load" />;

  return (
    <div className="page-stack" data-tour="simulation">
      <div className="page-heading">
        <div><span className="eyebrow">Operator training</span><h1>Scenario lab</h1><p>Practice the response loop without touching a real field device.</p></div>
        <div className="heading-stat"><strong>12</strong><span>safe scenario paths</span></div>
      </div>
      <div className="simulation-layout">
        <section className="panel scenario-panel">
          <div className="panel-header"><div><span className="eyebrow">Practice safely</span><h2>Try a scenario and watch the grid respond.</h2></div><span className="lab-badge"><Icon name="spark" size={14} /> Ready to try</span></div>
          <p className="panel-intro">These actions create realistic device messages. Use them to learn the full response: find the problem, send a crew, repair the line, and confirm power is back.</p>
          {(busy || progress > 0) && (
            <div className="sim-progress" role="status" aria-live="polite">
              <div className="sim-progress-head">
                <span>{busy ? "Running scenario — updating telemetry and tickets…" : "Done"}</span>
                <span className="sim-progress-percent">{progress}%</span>
              </div>
              <div className="sim-progress-track">
                <div className="sim-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <div className="scenario-section">
            <span className="section-kicker">Configured incident run</span>
            <fieldset className="sim-config" disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
              <label>
                <span>Fault type <HelpTooltip label="Fault type">Choose the outage pattern the deterministic localizer must distinguish.</HelpTooltip></span>
                <select onChange={(event) => setFaultType(event.target.value)} value={faultType}>
                  <option value="span">Span fault</option>
                  <option value="transformer">Transformer outage</option>
                  <option value="feeder">Feeder outage</option>
                </select>
              </label>
              <label>
                <span>Severity <HelpTooltip label="Severity">For span faults, higher severity starts closer to the transformer and affects more downstream poles.</HelpTooltip></span>
                <input max="100" min="10" onChange={(event) => setSeverity(Number(event.target.value))} type="range" value={severity} />
                <strong>{severity}%</strong>
              </label>
              <div className="noise-options">
                <span>Noise injection <HelpTooltip label="Noise injection">Adds messy telemetry after the fault so operators can see duplicate, stale, or offline-device handling.</HelpTooltip></span>
                <label><input checked={noise.duplicate_packet} onChange={() => toggleNoise("duplicate_packet")} type="checkbox" /> Duplicate packet</label>
                <label><input checked={noise.delayed_packet} onChange={() => toggleNoise("delayed_packet")} type="checkbox" /> Delayed packet</label>
                <label><input checked={noise.kill_device} onChange={() => toggleNoise("kill_device")} type="checkbox" /> Offline device</label>
              </div>
              <label className="repair-toggle">
                <input checked={repairAfterFault} onChange={() => setRepairAfterFault((value) => !value)} type="checkbox" />
                <span>Run repair simulation after fault</span>
              </label>
              <ActionButton disabled={busy || !selectedDt || (faultType === "feeder" && !feederId)} icon={busy ? undefined : "play"} onClick={runConfiguredScenario} variant="primary">
                {busy ? `Running… ${progress}%` : "Run configured scenario"}
              </ActionButton>
            </fieldset>
          </div>
          <div className="scenario-section"><span className="section-kicker">Create a power problem</span><div className="scenario-grid">{faultActions.map((action) => renderScenarioCard(action, action.variant, !selectedDt || (action.path.includes("feeder") && !feederId)))}</div></div>
          <div className="scenario-section"><span className="section-kicker">Bring power back</span><div className="scenario-grid">{repairActions.map((action) => renderScenarioCard(action, "mint", !selectedDt || (action.body.scope === "feeder" && !feederId)))}</div></div>
          <div className="scenario-section"><span className="section-kicker">Test messy device messages</span><div className="scenario-grid">{noiseActions.map((action) => renderScenarioCard(action))}</div></div>
        </section>
        <section className="panel playbook-panel">
          <div className="panel-header"><div><span className="eyebrow">Response guide</span><h2>Three steps to close an incident</h2></div><span className="playbook-number">03</span></div>
          <div className="playbook-steps"><div><span>01</span><strong>Find it</strong><p>A power change becomes one grouped incident.</p></div><div><span>02</span><strong>Send help</strong><p>Acknowledge the issue and assign a crew.</p></div><div><span>03</span><strong>Confirm it</strong><p>Close only after live messages show power is back.</p></div></div>
          <div className="lab-callout"><Icon name="shield" size={18} /><div><strong>Clear and explainable</strong><span>The system calculates the fault location; AI only writes the summary.</span></div></div>
        </section>
      </div>
    </div>
  );
}