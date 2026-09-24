# Travel Desk: React frontend

React 18 + Vite. Talks to the Travel Management REST API (Spring Boot).

## Run
1. Start the backend (default `http://localhost:8081`).
2. `npm install`
3. `npm run dev` → http://localhost:5173

To point at a different API, create `.env` with `VITE_API_URL=https://your-api.example.com`.
The backend allows the origin in its `CORS_ORIGIN` setting (default `http://localhost:5173`).

## Features
Browse and search trips, register/login (JWT), book and cancel, admin adds/deletes trips.
