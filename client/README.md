# PowerSense AI · Client

React 19 + Vite operator console for PowerSense AI.

## Scripts

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production bundle
npm run lint
```

Copy `.env.example` to `.env.local` to point the console at another API (`VITE_API_BASE_URL`).

## Structure

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | Shell, polling, keyboard shortcuts, toasts, routing between views |
| `src/App.css` | Design system: tokens for light/dark themes, layout and components |
| `src/pages/` | Overview, Network map, Incidents, Live signals, Practice lab (lazy-loaded) |
| `src/components/` | Shared UI: incident drawer, command palette, map, tour, tables |
| `src/utils/api.js` | `fetch` wrapper with timeouts and readable errors |
| `src/utils/format.js` | Labels, incident summaries, confidence breakdowns |

## Performance notes

- An inline boot screen and theme script in `index.html` paint before any JavaScript loads.
- Each page and Leaflet are separate chunks; the remaining chunks are prefetched once the first view is ready.
- Polling pauses while the tab is hidden and resumes immediately when it is shown again.
