# PowerSense AI

PowerSense AI is a control-room outage intelligence demo for the Propel take-home. It converts simulated pole telemetry into deterministic fault localization, incident grouping, operator tickets, restoration verification, and an AI-written plain-English incident summary.

## What Reviewers Should See

- Deterministic fault localization for span, transformer, and feeder faults.
- Confidence scores with an evidence breakdown.
- Grouped incidents instead of one alert per dark pole.
- Dead sensor, firmware 1.2, duplicate, out-of-order, missing telemetry, and scheduled outage handling.
- Incident lifecycle from detection through closure.
- OpenStreetMap network map with pole, transformer, fault boundary, and incident overlays.
- Simulator presets and repair verification.
- AI incident summaries that explain deterministic results without deciding fault location.
- Operator affordances: onboarding tour, command palette, keyboard shortcuts, empty states, skeleton loading, tooltips, color legend, dark/light mode.

## Run Locally

```bash
cd server
npm install
npm run seed
npm run dev
```

```bash
cd client
npm install
npm run dev
```

The client defaults to `http://localhost:5000/api`. Set `VITE_API_BASE_URL` for another backend.

## Verification

```bash
cd server && npm test
cd client && npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Decisions](docs/DECISIONS.md)
- [AI Workflow](docs/AI-WORKFLOW.md)
- [Compliance Audit](docs/COMPLIANCE_AUDIT.md)
