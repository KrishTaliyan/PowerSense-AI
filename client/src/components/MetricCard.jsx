import Icon from "./Icon.jsx";
import HelpTooltip from "./HelpTooltip.jsx";
import { cx } from "../utils/format.js";

export default function MetricCard({ label, value, detail, icon, accent = "mint", help, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper className={cx("metric-card", `metric-${accent}`, onClick && "metric-clickable")} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className="metric-topline"><span className="metric-icon"><Icon name={icon} size={17} /></span><span className="metric-label">{label}</span>{help && <HelpTooltip label={label}>{help}</HelpTooltip>}</div>
      <div className="metric-value">{value ?? "-"}</div>
      <div className="metric-detail">{detail || "Awaiting signal"}</div>
    </Wrapper>
  );
}
