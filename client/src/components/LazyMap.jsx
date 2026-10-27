import { lazy, Suspense } from "react";

// Leaflet is the heaviest dependency; load it after the rest of the view has painted.
const SchematicMap = lazy(() => import("./SchematicMap.jsx"));

export default function LazyMap(props) {
  return (
    <Suspense fallback={<div className="network-map map-loading"><span className="spinner" />Loading map…</div>}>
      <SchematicMap {...props} />
    </Suspense>
  );
}
