# Deployment

## Client

The client is a Vite app and can deploy to Vercel, Render static sites, Netlify, or any static host.

```bash
cd client
npm install
npm run build
```

Set:

```bash
VITE_API_BASE_URL=https://your-api.example.com/api
```

## Server

The server is an Express app.

```bash
cd server
npm install
npm start
```

Set:

```bash
PORT=5000
MONGO_URI=mongodb://...
```

## Docker Compose

The repository includes `docker-compose.yml` for local MongoDB plus API orchestration. Seed before review when a clean dataset is needed:

```bash
cd server
npm run seed
```

## Map Deployment

The map uses React Leaflet with OpenStreetMap tiles. It requires no Google Maps API, no paid provider, and no API key. It is deployable on Vercel and Render as long as the browser can reach OpenStreetMap tile servers.

## Pre-Submission Checks

```bash
cd server && npm test
cd client && npm run build
```
