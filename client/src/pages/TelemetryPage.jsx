import HelpTooltip from "../components/HelpTooltip.jsx";
import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import TelemetryTable from "../components/TelemetryTable.jsx";

export default function TelemetryPage({ error, loading, recentTelemetry, refresh, signalContinuity }) {
  if (loading) return <PageSkeleton rows={3} />;
  if (error && !recentTelemetry.length) return <ErrorState detail={error} onRetry={refresh} title="Live signals could not load" />;

  return (
    <div className="page-stack" data-tour="telemetry">
      <div className="page-heading">
        <div><span className="eyebrow">Device observability</span><h1>Signal stream</h1><p>Every packet is auditable, deduplicated, and classified before it changes state.</p></div>
        <div className="heading-stat"><strong>{signalContinuity}%</strong><span>clean signal rate <HelpTooltip label="Clean signal rate">Recent packets accepted after duplicate and stale checks. Lower values mean telemetry needs review before field action.</HelpTooltip></span></div>
      </div>
      <TelemetryTable telemetry={recentTelemetry} />
    </div>
  );
}
