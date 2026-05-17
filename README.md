# Mikveh Room Management System

A real-time room management system for mikveh facilities with dynamic room configuration and instant synchronization.

## Features

- **Dynamic Rooms**: Configure any number of rooms (1-50) via admin panel
- **Real-time Sync**: Instant updates across all clients using Socket.io
- **Multi-language**: English and Hebrew support with RTL
- **Responsive Design**: Works on tablets and desktops
- **Admin Panel**: Configure system settings
- **Room Tablets**: Individual room control screens
- **Staff Dashboard**: Live overview of all rooms

## Architecture

- **Frontend**: React + Vite + Tailwind CSS + Socket.io Client
- **Backend**: Node.js + Express + Socket.io Server
- **State Management**: Real-time via WebSocket connections

## Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

## Running the System

### Development Mode (Recommended)

Run both frontend and backend simultaneously:

```bash
npm run dev:full
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:5173 (or next available port)

### Manual Mode

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

## Routes

- `/` → Redirects to `/dashboard`
- `/dashboard` → Staff dashboard showing all rooms
- `/admin` → Admin panel for system configuration
- `/room/:id` → Individual room control (e.g., `/room/1`)

## API Endpoints

- `GET /api/rooms` - Get all rooms
- `GET /api/config` - Get system configuration
- `POST /api/config` - Update system configuration

## Socket Events

### Client → Server
- `updateRoom` - Update room status: `{ roomId, status }`

### Server → Client
- `roomsUpdate` - Full rooms array update
- `configUpdate` - Configuration update: `{ roomsCount }`

## Building for Production

```bash
npm run build
```

## Configuration

The system starts with 6 rooms by default. Use the admin panel at `/admin` to change the number of rooms. The backend will automatically generate the appropriate number of rooms and broadcast updates to all connected clients.

## Technologies Used

- React 18
- Vite
- Tailwind CSS
- Socket.io
- Express.js
- Framer Motion
- React Router
- i18next