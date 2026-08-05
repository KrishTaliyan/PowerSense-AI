# Decisions

## Preserve Existing Product Shape

The assignment hardening pass keeps the existing React/Express architecture and UI language. Changes are scoped to compliance and reviewer clarity rather than a redesign.

## Deterministic Localization

Fault location is calculated with topology and pole state. AI does not choose fault location because the assignment requires explainable, trustworthy localization.

## Honest Fallbacks

When topology is missing, the system returns a DT-level approximation with lower confidence instead of pretending span precision exists.

## OpenStreetMap Over Paid Maps

The network map uses React Leaflet and OpenStreetMap to satisfy no-key, no-paid-service deployment requirements.

## Group Tickets By Fault Area

Tickets are grouped by overlapping affected poles and fault identifiers. This avoids one ticket per dark pole and supports multiple simultaneous faults.

## Verification Requires Telemetry

Operators cannot close a repair only from intent. The ticket is verified only when every affected pole reports energized.

## AI As Explanation

AI summary is a communication layer. Deterministic fallback copy is always available so the UI degrades gracefully when AI is unavailable.

## Simulator As Reviewer Evidence

The simulator is intentionally broad. It exposes span, transformer, feeder, dead device, scheduled outage, firmware 1.2, duplicate, out-of-order, missing telemetry, multiple simultaneous faults, noise injection, repair, automatic verification, replay, and presets.
