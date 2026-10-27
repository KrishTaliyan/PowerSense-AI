# PowerSense AI · Server

Express 5 + MongoDB API for telemetry ingest, deterministic fault localization, incident tickets and the simulator.

## Scripts

```bash
npm install
cp .env.example .env   # then set MONGO_URI
npm run seed           # rebuild the demo network (deletes ALL existing poles, devices, telemetry and tickets)
npm run dev            # nodemon on http://localhost:5000
npm test               # node --test
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| GET | `/api/dashboard` | Stats, latest 20 tickets, latest 25 packets |
| GET | `/api/transformers` | Transformers with pole/device counts |
| GET | `/api/poles?dt_id=&feeder_id=&limit=` | Pole slice for the map |
| POST | `/api/telemetry` | Ingest one device packet |
| GET | `/api/telemetry/recent?limit=` | Recent packets |
| GET | `/api/tickets` · `/api/tickets/:id` | Incident tickets |
| GET | `/api/tickets/:id/replay` | Telemetry window for an incident |
| PATCH | `/api/tickets/:id/status` | Acknowledge, assign crew, verify (`resolved`) or close |
| POST | `/api/simulate/*` | Span, transformer, feeder faults, repairs and telemetry noise |

Responses are gzip-compressed, and malformed JSON bodies return a JSON `400` error.
