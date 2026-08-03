import TelemetryTable from "../components/TelemetryTable.jsx";

export default function TelemetryPage({ recentTelemetry, signalContinuity }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">Device observability</span><h1>Signal stream</h1><p>Every packet is auditable, deduplicated, and classified before it changes state.</p></div>
        <div className="heading-stat"><strong>{signalContinuity}%</strong><span>clean signal rate</span></div>
      </div>
      <TelemetryTable telemetry={recentTelemetry} />
    </div>
  );
}
