import { useEffect, useMemo, useState } from "react";
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

export default function ProductTour({ active, onClose, onNavigate }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];

  useEffect(() => {
    if (!active) return undefined;
    onNavigate(step.view);
    const timer = window.setTimeout(() => {
      document.querySelector(step.target)?.classList.add("tour-highlight");
    }, 80);
    return () => {
      window.clearTimeout(timer);
      document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
    };
  }, [active, onNavigate, step]);

  const progress = useMemo(() => `${index + 1} / ${steps.length}`, [index]);
  if (!active) return null;

  function finish() {
    window.localStorage.setItem("powersense-tour-complete", "true");
    onClose();
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
          <ActionButton disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))} variant="ghost">Back</ActionButton>
          <ActionButton icon={index === steps.length - 1 ? "check" : "arrow"} onClick={() => index === steps.length - 1 ? finish() : setIndex((current) => current + 1)} variant="primary">
            {index === steps.length - 1 ? "Finish" : "Next"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
