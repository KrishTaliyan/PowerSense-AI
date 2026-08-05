import { useEffect, useMemo, useRef, useState } from "react";
import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";

const steps = [
  {
    target: "[data-tour='tour-launch']",
    view: "Dashboard",
    title: "Take the guided tour",
    detail: "PowerSense is feature-rich, so this walkthrough highlights the views, controls, and evidence panels a first-time operator should understand.",
  },
  {
    target: "[data-tour='overview']",
    view: "Dashboard",
    title: "Start with the shift picture",
    detail: "Open incidents, dark poles, offline devices, and signal continuity are the first scan for a control-room operator.",
  },
  {
    target: "[data-tour='map']",
    view: "Map",
    title: "Inspect the network boundary",
    detail: "The OpenStreetMap view highlights fault spans, affected poles, boundary endpoints, transformer anchors, and fault markers without a paid API key.",
  },
  {
    target: "[data-tour='incidents']",
    view: "Tickets",
    title: "Work the incident queue",
    detail: "Each ticket carries evidence, confidence, restoration readiness, and a clear next action.",
  },
  {
    target: "[data-tour='telemetry']",
    view: "Telemetry",
    title: "Trust the live signals",
    detail: "The stream shows clean, duplicate, and stale packets so operators can audit what changed state and what was ignored.",
  },
  {
    target: "[data-tour='practice-lab']",
    view: "Simulation",
    title: "Audit the device stream",
    detail: "The practice lab lets reviewers create outages, repairs, noisy packets, and restoration checks without touching real devices.",
  },
  {
    target: "[data-tour='focus-mode']",
    view: "Dashboard",
    title: "Narrow the room during a response",
    detail: "Focus mode reduces the screen to the transformer, poles, and incidents that matter during active work.",
  },
  {
    target: "[data-tour='metrics']",
    view: "Dashboard",
    title: "Scan the metrics",
    detail: "The metric row exposes active incidents, critical exposure, offline devices, dark poles, and signal continuity.",
  },
  {
    target: "[data-tour='quick-actions']",
    view: "Dashboard",
    title: "Move fast with quick actions",
    detail: "Ctrl K opens search and commands for poles, transformers, feeders, incidents, PIN codes, and simulation actions.",
  },
  {
    target: "[data-tour='simulator']",
    view: "Simulation",
    title: "Run the simulator",
    detail: "Choose span, transformer, or feeder faults, inject messy telemetry, and optionally run repair plus automatic verification.",
  },
  {
    target: "[data-tour='ai-summary']",
    view: "Tickets",
    title: "Read the AI summary",
    detail: "Incident details use What happened, Why, Impact, and Next action so operators can move from explanation to response quickly.",
  },
  {
    target: "[data-tour='shortcuts']",
    view: "Dashboard",
    title: "Use keyboard shortcuts",
    detail: "Number keys jump between main views, Escape closes overlays, and Ctrl K opens the command palette.",
  },
];

const MAX_WAIT_MS = 2000;
const POLL_INTERVAL_MS = 60;

export default function ProductTour({ active, onClose, onNavigate }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const pollRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    onNavigate(step.view);

    let elapsed = 0;
    let cancelled = false;

    function clearHighlights() {
      document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
    }

    function tryHighlight() {
      if (cancelled) return;
      clearHighlights();
      const el = document.querySelector(step.target);
      if (el) {
        el.classList.add("tour-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      elapsed += POLL_INTERVAL_MS;
      if (elapsed < MAX_WAIT_MS) {
        pollRef.current = window.setTimeout(tryHighlight, POLL_INTERVAL_MS);
      }
    }

    // Give the view a moment to start navigating, then poll until it exists.
    pollRef.current = window.setTimeout(tryHighlight, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(pollRef.current);
      clearHighlights();
    };
  }, [active, index, onNavigate, step]);

  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const progress = useMemo(() => `${index + 1} / ${steps.length}`, [index]);
  const progressWidth = useMemo(() => `${Math.round(((index + 1) / steps.length) * 100)}%`, [index]);
  if (!active) return null;

  function finish() {
    try {
      window.localStorage.setItem("powersense-tour-complete", "true");
    } catch {
      // Closing the tour should never depend on browser storage.
    }
    document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
    setIndex(0);
    onClose();
  }

  function goBack() {
    setIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (index === steps.length - 1) {
      finish();
    } else {
      setIndex((current) => current + 1);
    }
  }

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="PowerSense product tour">
      <div className="tour-card">
        <div className="tour-top">
          <span className="tour-step">{progress}</span>
          <button className="tour-skip" onClick={finish} type="button">Skip tour</button>
        </div>
        <div className="tour-progress-track"><i style={{ width: progressWidth }} /></div>
        <span className="tour-icon"><Icon name="spark" size={18} /></span>
        <span className="tour-view-chip">{step.view}</span>
        <h2>{step.title}</h2>
        <p>{step.detail}</p>
        <div className="tour-actions">
          <ActionButton disabled={index === 0} onClick={goBack} variant="ghost">Previous</ActionButton>
          <ActionButton icon={index === steps.length - 1 ? "check" : "arrow"} onClick={goNext} variant="primary">
            {index === steps.length - 1 ? "Finish" : "Next"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
