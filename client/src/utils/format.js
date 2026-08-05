export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelative(value) {
  if (!value) return "No recent signal";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

export function titleCase(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function faultLabel(type) {
  return { span: "Span fault", transformer: "Transformer fault", feeder: "Feeder fault" }[type] || titleCase(type);
}

export function locationLabel(level) {
  return { span: "Exact span", dt: "Transformer area", feeder: "Whole feeder" }[level] || titleCase(level || "network");
}

export function statusLabel(status) {
  return {
    detected: "Detected",
    acknowledged: "Acknowledged",
    crew_assigned: "Crew assigned",
    resolved: "Resolved",
    verified: "Verified",
    closed: "Closed",
  }[status] || titleCase(status);
}

export function confidenceLabel(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export function confidenceTone(value) {
  const score = Number(value) || 0;
  if (score >= 0.8) return "High";
  if (score >= 0.55) return "Medium";
  return "Needs review";
}

export function incidentPriority(ticket) {
  const affected = Number(ticket?.affected_pole_count) || 0;
  if (ticket?.fault_type === "feeder" || affected >= 25) return { label: "Critical", tone: "critical" };
  if (ticket?.fault_type === "transformer" || affected >= 8) return { label: "High impact", tone: "high" };
  if (ticket?.can_verify_repair) return { label: "Ready to close", tone: "ready" };
  return { label: "Localized", tone: "watch" };
}

export function structuredIncidentSummary(ticket) {
  const affected = Number(ticket?.affected_pole_count) || 0;
  const remaining = Number(ticket?.remaining_dark_poles ?? affected);
  const span = estimatedFaultSpan(ticket);
  const summary = ticket?.ai_summary || ticket?.confidence_reason || "Live pole state changes triggered the outage localizer.";

  return [
    {
      icon: "alert",
      label: "What happened",
      value: `${faultLabel(ticket?.fault_type)} detected near ${span}.`,
      detail: summary,
      tone: "event",
    },
    {
      icon: "target",
      label: "Why",
      value: ticket?.confidence_reason || "The engine compared the last live pole with the first dark pole.",
      detail: `${confidenceLabel(ticket?.confidence)} confidence from ${locationLabel(ticket?.localization_level)} evidence.`,
      tone: "reason",
    },
    {
      icon: "users",
      label: "Impact",
      value: `${affected} affected pole${affected === 1 ? "" : "s"}`,
      detail: remaining > 0
        ? `${remaining} pole${remaining === 1 ? "" : "s"} still dark and waiting for restoration telemetry.`
        : "All affected poles are reporting energized.",
      tone: remaining > 0 ? "impact" : "resolved",
    },
    {
      icon: ticket?.can_verify_repair ? "check" : "wrench",
      label: "Next action",
      value: suggestedOperatorAction(ticket),
      detail: ticket?.can_verify_repair ? "Verification is available now." : "Keep the response moving through the incident workflow.",
      tone: ticket?.can_verify_repair ? "resolved" : "action",
    },
  ];
}

export function confidenceBreakdown(ticket) {
  const score = Number(ticket?.confidence) || 0;
  const factors = [];

  if (ticket?.localization_level === "span") {
    factors.push({
      label: "Live/dark boundary",
      value: ticket.last_live_pole_id && ticket.first_dark_pole_id
        ? `${ticket.last_live_pole_id} -> ${ticket.first_dark_pole_id}`
        : "First dark pole observed",
      tone: "positive",
    });
  } else if (ticket?.localization_level === "dt") {
    factors.push({
      label: "Topology limitation",
      value: "Pole ordering is missing, so the UI reports a transformer-area range.",
      tone: "warning",
    });
  } else {
    factors.push({
      label: "Feeder pattern",
      value: "Reporting poles across the feeder are dark.",
      tone: "positive",
    });
  }

  factors.push({
    label: "Affected evidence",
    value: `${ticket?.affected_pole_count || 0} affected pole${ticket?.affected_pole_count === 1 ? "" : "s"} in the incident set.`,
    tone: score >= 0.55 ? "positive" : "warning",
  });

  if (ticket?.remaining_dark_poles > 0) {
    factors.push({
      label: "Restoration check",
      value: `${ticket.remaining_dark_poles} affected pole${ticket.remaining_dark_poles === 1 ? "" : "s"} still dark.`,
      tone: "warning",
    });
  } else if (ticket?.affected_pole_count > 0) {
    factors.push({
      label: "Restoration check",
      value: "All affected poles currently report energized.",
      tone: "positive",
    });
  }

  if (ticket?.confidence_reason) {
    factors.push({ label: "Engine reason", value: ticket.confidence_reason, tone: "neutral" });
  }

  return {
    score: confidenceLabel(score),
    tone: confidenceTone(score),
    factors,
  };
}

export function estimatedFaultSpan(ticket) {
  if (!ticket) return "-";
  if (ticket.localization_level === "span") {
    if (ticket.last_live_pole_id && ticket.first_dark_pole_id) {
      return `${ticket.last_live_pole_id} to ${ticket.first_dark_pole_id}`;
    }
    return `Upstream of ${ticket.first_dark_pole_id || "first dark pole"}`;
  }
  if (ticket.localization_level === "dt") {
    return `${ticket.dt_id || "Selected DT"} affected area, exact pole order unavailable`;
  }
  if (ticket.localization_level === "feeder") {
    return `${ticket.feeder_id || "Feeder"} upstream of distribution transformers`;
  }
  return "Network area under review";
}

export function suggestedOperatorAction(ticket) {
  if (!ticket) return "Open the incident and review telemetry evidence.";
  if (["verified", "closed"].includes(ticket.status)) {
    return "No field action needed. Keep the ticket available for audit.";
  }
  if (ticket.can_verify_repair) {
    return "Verify restoration now; affected poles are reporting energized.";
  }
  if (ticket.status === "detected") {
    return ticket.localization_level === "span"
      ? "Acknowledge and dispatch a crew to inspect the estimated span."
      : "Acknowledge and inspect the reported area before dispatching repair work.";
  }
  if (ticket.status === "acknowledged") {
    return "Assign a crew and attach the incident evidence to the work order.";
  }
  if (ticket.status === "crew_assigned") {
    return "Wait for repair telemetry, then verify only when every affected pole is live.";
  }
  return "Monitor restoration telemetry until the incident can be verified.";
}

export function restorationCopy(ticket) {
  const isFinal = ["verified", "closed"].includes(ticket?.status);
  const remaining = Number(ticket?.remaining_dark_poles ?? ticket?.affected_pole_count ?? 0);

  if (isFinal) {
    return {
      tone: "ready",
      title: "Restoration verified",
      detail: "All affected poles have reported power back.",
    };
  }

  if (ticket?.can_verify_repair) {
    return {
      tone: "ready",
      title: "Ready to verify",
      detail: "Every affected pole is energized. Verify the repair to complete the response loop.",
    };
  }

  return {
    tone: "waiting",
    title: remaining > 0
      ? `${remaining} ${remaining === 1 ? "pole is" : "poles are"} still dark`
      : "Waiting for restoration telemetry",
    detail: "Restore power or wait for a fresh live signal before verifying this repair.",
  };
}

export function readableError(message) {
  if (message?.toLowerCase().includes("affected poles are still dark")) {
    return "Some affected poles are still without power. Restore the line, wait for a fresh device signal, then try again.";
  }
  if (message?.toLowerCase().includes("backend is not responding")) {
    return "The live connection is unavailable. Check the API and refresh when it is back online.";
  }
  return message || "Something went wrong. Try again in a moment.";
}
