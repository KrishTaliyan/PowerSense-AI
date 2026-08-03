import { cx, statusLabel } from "../utils/format.js";

export default function StatusPill({ status }) {
  return <span className={cx("status-pill", `status-${status}`)}><span className="status-dot" />{statusLabel(status)}</span>;
}
