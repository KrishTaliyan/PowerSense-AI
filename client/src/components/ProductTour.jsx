import { useEffect, useMemo, useRef, useState } from "react";
import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";

const steps = [
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
    detail: "The schematic view shows energized poles, dark poles, missing devices, and estimated fault markers without requiring map keys.",
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
    title: "Audit the device stream",
    detail: "Operators can see duplicate and stale packets before trusting a state change.",
  },
  {
    target: "[data-tour='simulation']",
    view: "Simulation",
    title: "Practice safely",
    detail: "Use configurable faults, noise, and repair simulation to demonstrate the response loop during review.",
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

  const progress = useMemo(() => `${index + 1} / ${steps.length}`, [index]);
  if (!active) return null;

  function finish() {
    window.localStorage.setItem("powersense-tour-complete", "true");
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
          <button className="tour-skip" onClick={finish} type="button">Skip Tour</button>
        </div>
        <span className="tour-icon"><Icon name="spark" size={18} /></span>
        <h2>{step.title}</h2>
        <p>{step.detail}</p>
        <div className="tour-actions">
          <ActionButton disabled={index === 0} onClick={goBack} variant="ghost">Back</ActionButton>
          <ActionButton icon={index === steps.length - 1 ? "check" : "arrow"} onClick={goNext} variant="primary">
            {index === steps.length - 1 ? "Finish" : "Next"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}