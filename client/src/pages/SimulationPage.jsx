import { useEffect, useRef, useState } from "react";
import ActionButton from "../components/ActionButton.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";
import Icon from "../components/Icon.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import { cx } from "../utils/format.js";

const EXPECTED_DURATION_MS = 12000; // typical round trip for a configured scenario against a hosted API

export default function SimulationPage({ busy, error, feederId, fromSeq, loading, post, refresh, selectedDt, selectedTransformer }) {
  const [faultType, setFaultType] = useState("span");
  const [severity, setSeverity] = useState(55);
  const [noise, setNoise] = useState({
    duplicate_packet: true,
    out_of_order_telemetry: false,
    missing_telemetry: false,
    kill_device: false,
    firmware_12_device: false,
    multiple_faults: false,
  });
  const [repairAfterFault, setRepairAfterFault] = useState(false);
  const [progress, setProgress] = useState(0);
  const wasBusyRef = useRef(false);

  useEffect(() => {
    if (busy) {
      wasBusyRef.current = true;
      const start = Date.now();
      const startTimeout = window.setTimeout(() => setProgress(3), 0);
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - start;
        // Approaches 92% asymptotically — never claims done until the response actually lands.
        const pct = 92 * (1 - Math.exp(-elapsed / EXPECTED_DURATION_MS));
        setProgress(Math.min(92, Math.round(pct)));
      }, 150);
      return () => {
        window.clearTimeout(startTimeout);
        window.clearInterval(interval);
      };
    }

    if (wasBusyRef.current) {
      let resetTimeout;
      const doneTimeout = window.setTimeout(() => {
        setProgress(100);
        resetTimeout = window.setTimeout(() => {
          setProgress(0);
          wasBusyRef.current = false;
        }, 600);
      }, 0);
      return () => {
        window.clearTimeout(doneTimeout);
        window.clearTimeout(resetTimeout);
      };
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
    { title: "Dead device", description: "Separate a silent sensor from a genuinely dark pole.", icon: "satellite", path: "/simulate/kill-device", body: {} },
    { title: "Firmware 1.2 device", description: "Model legacy firmware that misses power_lost events.", icon: "radio", path: "/simulate/firmware-12-device", body: {} },
    { title: "Missing telemetry", description: "Age a device signal without changing power state.", icon: "satellite", path: "/simulate/missing-telemetry", body: {} },
    { title: "Duplicate packet", description: "Quarantine the same sequence without changing pole state.", icon: "copy", path: "/simulate/duplicate-message", body: {} },
    { title: "Out-of-order telemetry", description: "Ignore old telemetry while retaining an audit trail.", icon: "radio", path: "/simulate/delayed-message", body: {} },
    { title: "Multiple faults", description: "Create two simultaneous incidents and confirm grouping.", icon: "alert", path: "/simulate/multiple-faults", body: { dt_id: selectedDt, feeder_id: feederId } },
  ];
  const repairActions = [
    { title: "Restore span", description: "Send restoration telemetry for the selected segment.", icon: "wrench", body: { dt_id: selectedDt, from_seq: fromSeq } },
    { title: "Restore transformer", description: "Bring every pole behind the selected transformer live.", icon: "check", body: { scope: "transformer", dt_id: selectedDt } },
    { title: "Restore feeder", description: "Verify the wide-area restoration workflow.", icon: "check", body: { scope: "feeder", feeder_id: feederId } },
  ];
  const presetActions = [
    { title: "Normal Day", description: "Low-noise span run with automatic repair verification.", icon: "check", body: { dt_id: selectedDt, feeder_id: feederId, fault_type: "span", severity: 35, noise: {}, repair_after_fault: true } },
    { title: "Storm", description: "Multiple faults with duplicate and out-of-order telemetry.", icon: "alert", body: { dt_id: selectedDt, feeder_id: feederId, fault_type: "feeder", severity: 85, noise: { duplicate_packet: true, out_of_order_telemetry: true, multiple_faults: true }, repair_after_fault: false } },
    { title: "Heavy Rain", description: "Transformer event with missing telemetry and a dead device.", icon: "bolt", body: { dt_id: selectedDt, feeder_id: feederId, fault_type: "transformer", severity: 75, noise: { missing_telemetry: true, kill_device: true }, repair_after_fault: false } },
    { title: "Peak Load", description: "High-impact feeder scenario for critical incident focus.", icon: "radio", body: { dt_id: selectedDt, feeder_id: feederId, fault_type: "feeder", severity: 90, noise: { duplicate_packet: true }, repair_after_fault: false } },
    { title: "Maintenance Window", description: "Scheduled outage path that suppresses false alarms.", icon: "clock", path: "/simulate/scheduled-outage", body: { dt_id: selectedDt } },
  ];

  const noiseOptions = [
    { key: "duplicate_packet", label: "Duplicate telemetry" },
    { key: "out_of_order_telemetry", label: "Out-of-order telemetry" },
    { key: "missing_telemetry", label: "Missing telemetry" },
    { key: "kill_device", label: "Dead device" },
    { key: "firmware_12_device", label: "Firmware 1.2 device" },
    { key: "multiple_faults", label: "Multiple simultaneous faults" },
  ];
  const faultTypes = [
    { id: "span", label: "Span" },
    { id: "transformer", label: "Transformer" },
    { id: "feeder", label: "Feeder" },
  ];

  const renderScenarioCard = (action, variant = "quiet", disabled = false) => (
    <button className={cx("scenario-card", `scenario-card-${variant}`)} disabled={busy || disabled} key={action.title} onClick={() => post(action.path || "/simulate/repair", action.body, action.title)} type="button">
      <span className={cx("scenario-icon", `scenario-${variant}`)}><Icon name={action.icon} size={17} /></span>
      <span className="scenario-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
      <Icon name="chevronRight" size={15} />
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

  const scenarioCount = presetActions.length + faultActions.length + repairActions.length + noiseActions.length;

  return (
    <div className="page-stack" data-tour="practice-lab">
      <div className="page-heading">
        <div><span className="eyebrow">Operator training</span><h1>Practice lab</h1><p>Practice the response loop with simulated device messages. No real field equipment is touched.</p></div>
        <div className="heading-actions">
          <span className="target-chip"><Icon name="layers" size={14} />Target <strong>{selectedTransformer?.dt_id || selectedDt || "—"}</strong> · <strong>{feederId || "—"}</strong></span>
        </div>
      </div>

      {(busy || progress > 0) && (
        <div className="sim-progress" role="status" aria-live="polite">
          <div className="sim-progress-head">
            <span>{busy ? "Running scenario: sending telemetry and updating incidents…" : "Scenario complete"}</span>
            <span className="sim-progress-percent">{progress}%</span>
          </div>
          <div className="sim-progress-track"><div className="sim-progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div className="simulation-layout">
        <div className="simulation-main">
          <section className="panel" data-tour="simulator">
            <div className="panel-header"><div><span className="eyebrow">Configured run</span><h2>Build a scenario</h2></div><span className="count-badge">{scenarioCount} scenario paths</span></div>
            <fieldset className="sim-config" disabled={busy}>
              <div className="field">
                <span className="field-label">Fault type <HelpTooltip label="Fault type">Choose the outage pattern the deterministic localizer must distinguish.</HelpTooltip></span>
                <div className="segmented segmented-full" role="radiogroup" aria-label="Fault type">
                  {faultTypes.map((type) => (
                    <button aria-checked={faultType === type.id} className={cx("segment", faultType === type.id && "segment-active")} key={type.id} onClick={() => setFaultType(type.id)} role="radio" type="button">{type.label}</button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span className="field-label">Severity <HelpTooltip label="Severity">For span faults, higher severity starts closer to the transformer and affects more downstream poles.</HelpTooltip><b>{severity}%</b></span>
                <input className="range" max="100" min="10" onChange={(event) => setSeverity(Number(event.target.value))} style={{ "--range-fill": `${((severity - 10) / 90) * 100}%` }} type="range" value={severity} />
              </label>
              <div className="field field-wide">
                <span className="field-label">Noise injection <HelpTooltip label="Noise injection">Adds messy telemetry after the fault so operators can see duplicate, stale, or offline-device handling.</HelpTooltip></span>
                <div className="chip-group">
                  {noiseOptions.map((option) => (
                    <button aria-pressed={noise[option.key]} className={cx("toggle-chip", noise[option.key] && "toggle-chip-on")} key={option.key} onClick={() => toggleNoise(option.key)} type="button">
                      <Icon name={noise[option.key] ? "check" : "plus"} size={13} />{option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sim-config-footer field-wide">
                <label className="checkbox-row">
                  <input checked={repairAfterFault} onChange={() => setRepairAfterFault((value) => !value)} type="checkbox" />
                  <span>Run repair and verification after the fault</span>
                </label>
                <ActionButton disabled={busy || !selectedDt || (faultType === "feeder" && !feederId)} icon={busy ? undefined : "play"} onClick={runConfiguredScenario} variant="primary">
                  {busy ? `Running… ${progress}%` : "Run scenario"}
                </ActionButton>
              </div>
            </fieldset>
          </section>

          <section className="panel">
            <div className="panel-header"><div><span className="eyebrow">One click</span><h2>Presets</h2></div></div>
            <div className="scenario-grid">{presetActions.map((action) => renderScenarioCard({ ...action, path: action.path || "/simulate/configured" }, "info", !selectedDt || (action.body.fault_type === "feeder" && !feederId)))}</div>
          </section>

          <section className="panel">
            <div className="panel-header"><div><span className="eyebrow">Individual actions</span><h2>Faults, repairs and telemetry noise</h2></div></div>
            <div className="scenario-section"><span className="section-kicker">Create a power problem</span><div className="scenario-grid">{faultActions.map((action) => renderScenarioCard(action, action.variant, !selectedDt || (action.path.includes("feeder") && !feederId)))}</div></div>
            <div className="scenario-section"><span className="section-kicker">Bring power back</span><div className="scenario-grid">{repairActions.map((action) => renderScenarioCard(action, "success", !selectedDt || (action.body.scope === "feeder" && !feederId)))}</div></div>
            <div className="scenario-section"><span className="section-kicker">Test messy device messages</span><div className="scenario-grid">{noiseActions.map((action) => renderScenarioCard(action))}</div></div>
          </section>
        </div>

        <aside className="panel playbook-panel">
          <div className="panel-header"><div><span className="eyebrow">Response guide</span><h2>Closing an incident</h2></div></div>
          <ol className="playbook-steps">
            <li><span>1</span><div><strong>Find it</strong><p>A power change becomes one grouped incident with a localized boundary.</p></div></li>
            <li><span>2</span><div><strong>Send help</strong><p>Acknowledge the incident and assign a field crew.</p></div></li>
            <li><span>3</span><div><strong>Confirm it</strong><p>Verify only after live messages show every affected pole has power.</p></div></li>
          </ol>
          <div className="lab-callout"><Icon name="shield" size={16} /><div><strong>Deterministic first</strong><span>The engine calculates the fault location; AI only writes the plain-English summary.</span></div></div>
        </aside>
      </div>
    </div>
  );
}
