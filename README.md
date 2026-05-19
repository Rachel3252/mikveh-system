# Mikveh Room Management System

A full-stack mikveh room management system with a separated frontend and backend.

## Project Structure

- `/client` - React + Vite frontend
- `/server` - Node.js + Express + Socket.io backend

## Setup

### Install dependencies

```bash
npm install
cd server
npm install
cd ../client
npm install
```

### Development

Run both services together from the repo root:

```bash
npm run dev
```

Or start each service independently:

```bash
npm run server:dev
npm run client:dev
```

### Production build

From `/client`:

```bash
npm run build
```

## Client

- `/client/package.json` contains frontend scripts:
  - `dev`
  - `build`
  - `preview`
- Environment file: `/client/.env`
- Vercel deployment target: `/client`

## Server

- `/server/package.json` contains backend scripts:
  - `start`
  - `dev`
- Environment file: `/server/.env`
- Railway deployment target: `/server`

## Server root route

The backend returns a health response on `/`:

```text
Mikveh backend running
```

## Environment files

### `/client/.env`
```env
VITE_API_URL=
VITE_SOCKET_URL=
```

### `/server/.env`
```env
PORT=3000
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=https://mikveh-system.vercel.app
```

## Deployment

- Vercel: deploy the frontend from `/client`
- Railway: deploy the backend from `/server`

## Notes

This repo is now structured as a professional full-stack workspace with separate client and server packages.
