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
