import Icon from "./Icon.jsx";

export default function CommandPalette({ onClose, onNavigate, onAction }) {
  const commands = [
    { label: "Open command center", hint: "1", icon: "grid", action: () => onNavigate("Dashboard") },
    { label: "Open incident queue", hint: "3", icon: "alert", action: () => onNavigate("Tickets") },
    { label: "Inspect network map", hint: "2", icon: "map", action: () => onNavigate("Map") },
    { label: "Inject span fault", hint: "demo", icon: "bolt", action: () => onAction("span") },
    { label: "Open scenario lab", hint: "5", icon: "flask", action: () => onNavigate("Simulation") },
  ];

  return (
    <div className="palette-backdrop" onClick={onClose} role="presentation">
      <div className="command-palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette-search"><Icon name="search" size={18} /><input autoFocus placeholder="Jump to a view or run a command..." /><kbd>ESC</kbd></div>
        <div className="palette-label">Quick actions</div>
        {commands.map((command) => (
          <button className="palette-command" key={command.label} onClick={() => { command.action(); onClose(); }} type="button">
            <span className="palette-icon"><Icon name={command.icon} size={16} /></span>
            <span>{command.label}</span>
            <kbd>{command.hint}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
