import Icon from "./Icon.jsx";

export default function HelpTooltip({ label, children }) {
  return (
    <span className="help-tooltip">
      <span aria-label={`Help: ${label}`} className="help-trigger" role="img" tabIndex="0">
        <Icon name="help" size={13} />
      </span>
      <span className="help-bubble" role="tooltip">
        <strong>{label}</strong>
        <span>{children}</span>
      </span>
    </span>
  );
}
