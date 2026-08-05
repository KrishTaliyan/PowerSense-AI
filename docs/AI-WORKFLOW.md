# AI Workflow

## Purpose

The AI feature is an incident summary for operators and reviewers. It explains what happened in plain English.

## AI Does Not Localize

Fault localization is deterministic:

- Topology-aware span localization.
- Transformer-area fallback when pole order is missing.
- Feeder-level localization for all-dark feeder patterns.
- Confidence scores and reasons from the localizer.

The AI summary consumes those outputs; it does not create or override them.

## Summary Content

Each incident summary should explain:

- What happened.
- Why the system believes it happened.
- Estimated location.
- Confidence.
- Evidence.
- Recommended next step.

## Fallback

If an external AI service is unavailable, `ticketService.buildIncidentSummary` creates deterministic fallback copy from the fault object. The UI also falls back to `confidence_reason` when `ai_summary` is absent.

## Review Guidance

Open an incident drawer and inspect:

- `AI incident summary`.
- `Confidence breakdown`.
- `Evidence`.
- `Telemetry replay`.

Those sections demonstrate that AI is used for explanation only.
