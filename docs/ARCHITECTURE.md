# Architecture

## Overview

PowerSense is split into a React/Vite client and an Express/Mongoose API. MongoDB stores network topology, device state, telemetry, scheduled outages, and tickets.

## Client

- `App.jsx` owns global view state, polling, command palette state, theme, selected transformer/pole/ticket, and first-visit tour state.
- `SchematicMap.jsx` now renders a React Leaflet/OpenStreetMap map while preserving the previous component boundary. It overlays pole markers, transformer markers, incident markers, fault boundary markers, topology polylines, highlighted fault spans, popups, fit bounds, and animated incident focus.
- `TicketDrawer.jsx` presents the incident brief, AI summary, confidence breakdown, affected poles, telemetry replay, lifecycle actions, and restoration verification state.
- `SimulationPage.jsx` exposes fault injection, messy telemetry, repair, automatic verification, and named presets.
- `ProductTour.jsx` provides the first-visit onboarding walkthrough and Settings restart path.

## Server

- `telemetryService.js` ingests telemetry, detects duplicate/stale packets, suppresses scheduled outages, updates device/pole state, triggers localization, and checks restoration.
- `fault-engine/localize.js` is deterministic and rule-based. It localizes known topology to span boundaries, missing topology to an honest DT-level approximation, and all-dark feeders to feeder-level faults.
- `ticket-engine/ticketService.js` upserts grouped incidents, builds deterministic AI-summary fallback copy, enriches restoration state, and verifies tickets only after affected poles report energized.
- `simulation/simulateFault.js` generates span, transformer, feeder, scheduled outage, dead device, firmware 1.2, duplicate, out-of-order, missing telemetry, multiple fault, and repair scenarios.

## Data Flow

1. Simulator or API receives telemetry.
2. Telemetry is stored for audit.
3. Duplicate and stale packets are quarantined from state changes.
4. Applied telemetry updates device and pole state.
5. Scheduled outages suppress false ticket creation.
6. Deterministic localization produces one or more fault candidates.
7. Tickets are grouped/upserted from affected pole overlap.
8. Operators acknowledge, assign, repair, verify, and close.
9. Replay API returns the telemetry window for reviewer inspection.

## AI Boundary

AI is not used for localization. The system localizes with deterministic topology and telemetry rules. The AI feature is a plain-English incident summary with deterministic fallback copy when an AI service is unavailable.
