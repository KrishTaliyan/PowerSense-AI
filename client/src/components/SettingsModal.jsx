import ActionButton from "./ActionButton.jsx";
import HelpTooltip from "./HelpTooltip.jsx";
import Icon from "./Icon.jsx";

export default function SettingsModal({ onClose, onRestartTour, theme, setTheme }) {
  return (
    <div className="settings-backdrop" onClick={onClose} role="presentation">
      <section className="settings-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <div className="drawer-head">
          <div><span className="eyebrow">Operator settings</span><h2>Settings</h2></div>
          <button className="icon-button" aria-label="Close settings" onClick={onClose} type="button"><Icon name="close" size={19} /></button>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <strong>Theme</strong>
              <span>Keep the same interface readable in bright rooms and night shifts.</span>
            </div>
            <button className="theme-toggle settings-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} type="button">
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
          </div>
          <div className="settings-row">
            <div>
              <strong>Product tour <HelpTooltip label="Product tour">Restarts the guided walkthrough without changing any incident or telemetry data.</HelpTooltip></strong>
              <span>Review how operators move from detection to verification.</span>
            </div>
            <ActionButton icon="spark" onClick={onRestartTour} variant="secondary">Restart Tour</ActionButton>
          </div>
        </div>
      </section>
    </div>
  );
}
