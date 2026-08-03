import Icon from "./Icon.jsx";
import Sparkline from "./Sparkline.jsx";
import { cx } from "../utils/format.js";

export default function SignalHealthPanel({ values }) {
  const hasSignals = values.length > 0;
  return (
    <section className="panel signal-panel">
      <div className="panel-header"><div><span className="eyebrow">Recent device messages</span><h2>Power signal health</h2></div><div className="pulse-legend"><span><i className="legend-line mint-line" />Power on</span><span><i className="legend-line coral-line" />Power off</span></div></div>
      <div className={cx("pulse-chart", !hasSignals && "pulse-empty")}>
        {hasSignals ? <Sparkline color="#7ce4bd" height={140} values={values} /> : <div className="chart-empty"><span className="chart-empty-icon"><Icon name="radio" size={19} /></span><strong>Waiting for device messages</strong><span>The chart will fill as poles report their power state.</span></div>}
        <div className="chart-axis"><span>5 minutes ago</span><span>Now</span></div>
      </div>
    </section>
  );
}
