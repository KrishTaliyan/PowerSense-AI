import Icon from "./Icon.jsx";
import { cx } from "../utils/format.js";

export default function ActionButton({ children, onClick, disabled = false, variant = "secondary", icon, className, title }) {
  return (
    <button className={cx("action-button", `button-${variant}`, className)} disabled={disabled} onClick={onClick} title={title} type="button">
      {icon && <Icon name={icon} size={16} />}
      <span>{children}</span>
    </button>
  );
}
