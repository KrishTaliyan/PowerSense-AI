import Icon from "./Icon.jsx";
import { stageOrder } from "../constants.js";
import { cx, statusLabel } from "../utils/format.js";

export default function StageRail({ status }) {
  const current = status === "closed" ? stageOrder.length - 1 : stageOrder.indexOf(status);
  return (
    <div className="stage-rail" aria-label={`Incident status: ${statusLabel(status)}`}>
      {stageOrder.map((stage, index) => (
        <div className={cx("stage-item", index <= current && "stage-done", index === current && "stage-current")} key={stage}>
          <span className="stage-node">{index < current ? <Icon name="check" size={11} /> : index + 1}</span>
          <span>{statusLabel(stage)}</span>
        </div>
      ))}
    </div>
  );
}
