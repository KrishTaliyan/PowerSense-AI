import ActionButton from "./ActionButton.jsx";
import Icon from "./Icon.jsx";

export function EmptyState({ icon = "search", title, detail, action }) {
  return (
    <div className="empty-state rich-empty">
      <span className="empty-check"><Icon name={icon} size={20} /></span>
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  );
}

export function ErrorState({ title = "This view could not load", detail, onRetry }) {
  return (
    <div className="panel page-state-panel">
      <div className="state-card state-error">
        <span className="state-icon"><Icon name="alert" size={23} /></span>
        <strong>{title}</strong>
        <span>{detail || "The live API is unavailable. Check the server and refresh the view."}</span>
        {onRetry && <ActionButton icon="refresh" onClick={onRetry} variant="secondary">Try again</ActionButton>}
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 3 }) {
  return (
    <div className="skeleton-stack" aria-label="Loading content">
      <div className="skeleton-hero" />
      <div className="skeleton-grid">
        {Array.from({ length: rows }).map((_, index) => <span className="skeleton-card" key={index} />)}
      </div>
      <div className="skeleton-panel" />
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 6 }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, row) => (
        <div className="skeleton-row" key={row}>
          {Array.from({ length: columns }).map((__, column) => <span key={column} />)}
        </div>
      ))}
    </div>
  );
}
