import Icon from "./Icon.jsx";
import { cx, formatDate } from "../utils/format.js";

const timelineStages = [
  { id: "detection", label: "Detection", field: "detected_at", fallback: true },
  { id: "localization", label: "Localization", field: "detected_at", fallback: true },
  { id: "crew", label: "Crew Assigned", field: "crew_assigned_at" },
  { id: "resolved", label: "Resolved", field: "resolved_at" },
  { id: "verified", label: "Verified", field: "verified_at" },
];

export default function IncidentTimeline({ ticket }) {
  return (
    <div className="incident-timeline">
      {timelineStages.map((stage) => {
        const value = ticket?.[stage.field];
        const done = Boolean(value) || stage.fallback;
        return (
          <div className={cx("timeline-step", done && "timeline-done")} key={stage.id}>
            <span className="timeline-node">{done ? <Icon name="check" size={11} /> : ""}</span>
            <div>
              <strong>{stage.label}</strong>
              <span>{value ? formatDate(value) : stage.fallback ? "Completed by engine" : "Pending"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
