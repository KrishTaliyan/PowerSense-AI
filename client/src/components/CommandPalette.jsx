import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { cx, faultLabel } from "../utils/format.js";

export default function CommandPalette({
  onAction,
  onClose,
  onNavigate,
  onSelectPole,
  onSelectTicket,
  onSelectTransformer,
  poles = [],
  tickets = [],
  transformers = [],
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const commands = useMemo(() => {
    const staticCommands = [
      { label: "Open overview", hint: "view", icon: "grid", search: "dashboard overview", action: () => onNavigate("Dashboard") },
      { label: "Open incident queue", hint: "view", icon: "alert", search: "tickets incidents", action: () => onNavigate("Tickets") },
      { label: "Inspect network map", hint: "view", icon: "map", search: "map poles transformer feeder", action: () => onNavigate("Map") },
      { label: "Open live signals", hint: "view", icon: "pulse", search: "telemetry live signals", action: () => onNavigate("Telemetry") },
      { label: "Open scenario lab", hint: "view", icon: "flask", search: "simulation practice lab", action: () => onNavigate("Simulation") },
      { label: "Inject span fault", hint: "demo", icon: "bolt", search: "simulate span fault", action: () => onAction("span") },
    ];
    const feederCommands = [...new Set(transformers.map((transformer) => transformer.feeder_id).filter(Boolean))]
      .slice(0, 12)
      .map((feederId) => ({
        label: `Open feeder ${feederId}`,
        hint: "feeder",
        icon: "radio",
        search: `feeder ${feederId}`,
        action: () => onNavigate("Map"),
      }));
    const transformerCommands = transformers.slice(0, 30).map((transformer) => ({
      label: `Focus ${transformer.dt_id}`,
      hint: "DT",
      icon: "map",
      search: `${transformer.dt_id} ${transformer.feeder_id}`,
      action: () => onSelectTransformer(transformer),
    }));
    const incidentCommands = tickets.slice(0, 30).map((ticket) => ({
      label: `${ticket.ticket_id} - ${faultLabel(ticket.fault_type)}`,
      hint: "incident",
      icon: "alert",
      search: `${ticket.ticket_id} ${ticket.fault_type} ${ticket.dt_id || ""} ${ticket.feeder_id || ""} ${ticket.pincode || ""}`,
      action: () => onSelectTicket(ticket),
    }));
    const poleCommands = poles.slice(0, 80).map((pole) => ({
      label: `Inspect pole ${pole.pole_id}`,
      hint: pole.device_id ? "pole" : "no device",
      icon: "target",
      search: `${pole.pole_id} ${pole.device_id || ""} ${pole.dt_id || ""} ${pole.feeder_id || ""}`,
      action: () => onSelectPole(pole),
    }));

    return [...staticCommands, ...incidentCommands, ...transformerCommands, ...feederCommands, ...poleCommands];
  }, [onAction, onNavigate, onSelectPole, onSelectTicket, onSelectTransformer, poles, tickets, transformers]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = commands
    .filter((command) => `${command.label} ${command.search}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 18);
  const selectedIndex = Math.min(activeIndex, Math.max(0, filteredCommands.length - 1));

  function run(command) {
    command.action();
    onClose();
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((selectedIndex + 1) % Math.max(1, filteredCommands.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((selectedIndex - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (event.key === "Enter" && filteredCommands[selectedIndex]) {
      event.preventDefault();
      run(filteredCommands[selectedIndex]);
    }
  }

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div aria-label="Command palette" aria-modal="true" className="command-palette" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="palette-search"><Icon name="search" size={17} /><input aria-label="Search commands" autoFocus onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onKeyDown} placeholder="Search incidents, poles, feeders, transformers…" value={query} /><kbd>Esc</kbd></div>
        <div className="palette-label">{query ? "Results" : "Quick actions"}</div>
        <div className="palette-list">
        {filteredCommands.map((command, index) => (
          <button className={cx("palette-command", index === selectedIndex && "palette-command-active")} key={command.label} onClick={() => run(command)} onMouseMove={() => setActiveIndex(index)} type="button">
            <span className="palette-icon"><Icon name={command.icon} size={16} /></span>
            <span>{command.label}</span>
            <kbd>{command.hint}</kbd>
          </button>
        ))}
        {!filteredCommands.length && <div className="palette-empty">No matching command. Try a pole, transformer, feeder, or incident ID.</div>}
        </div>
        <div className="palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span></div>
      </div>
    </div>
  );
}
