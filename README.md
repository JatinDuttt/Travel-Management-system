# Travel Desk: Travel & Hotel Booking Platform

**Live demo: [travel.duttjatin.pro](https://travel.duttjatin.pro)**

Full-stack booking app for trips and hotels. Spring Boot 3 REST API with JWT auth, a React frontend, MySQL, and a complete deployment pipeline: Docker, Terraform on AWS EC2, GitHub Actions CI/CD, and automatic HTTPS.

**Stack:** Java 17 · Spring Boot 3 · Spring Security + JWT · JPA/Hibernate · MySQL 8 · React 18 + Vite · Docker Compose · Nginx · Caddy · Terraform · GitHub Actions · Prometheus metrics

## Features
- Browse and search trips (by destination and max price) and hotels (by city).
- Book trips by number of travelers, and hotels by date range and number of rooms.
- Cancel bookings; seats and rooms are released automatically.
- Roles: normal users book and cancel their own bookings; admins add and delete trips and hotels.
- Admin "Users" page: every account with its trip and hotel booking counts, confirmed value, and a per-user booking history.
- Admin "Manage bookings" page: all trip and hotel bookings with search, status filter, totals, and one-click cancel.
- Destination photos are looked up on Wikipedia at runtime, with a colour fallback.

## Architecture
```
Browser --HTTPS--> Caddy (TLS, Let's Encrypt) --> Nginx (React build + /api proxy) --> Spring Boot API --> MySQL
```
Everything runs as containers on one EC2 instance via `deploy/docker-compose.prod.yml`.

## Run locally
**Backend (Docker, recommended):**
```
docker compose up --build
```
API: http://localhost:8081 · Swagger UI: http://localhost:8081/swagger-ui.html · Health: `/actuator/health` · Metrics: `/actuator/prometheus`

**Backend without Docker:** start MySQL, then `mvn spring-boot:run` (defaults are in `application.properties`; the API listens on port 8081).

**Frontend:**
```
cd frontend
npm install
npm run dev
```
Opens at http://localhost:5173 and talks to http://localhost:8081. To use a different API, create `frontend/.env` with `VITE_API_URL=https://your-api.example.com`.

**Tests:** `mvn test` (unit tests for trip and hotel booking logic; CI runs `mvn verify`).

Default admin (dev only): `admin@travel.com` / `Admin@12345`. In any real deployment set `ADMIN_PASSWORD`, `JWT_SECRET`, `DB_PASSWORD` and `CORS_ORIGIN`. The admin account is created once at first start; changing `ADMIN_PASSWORD` later does not update an existing account.

## API
| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/packages?destination=&maxPrice=&page=&size=` | public |
| POST/PUT/DELETE | `/api/packages`, `/api/packages/{id}` | ADMIN |
| GET | `/api/hotels?city=` | public |
| POST/DELETE | `/api/hotels`, `/api/hotels/{id}` | ADMIN |
| POST | `/api/bookings` `{packageId, travelers}` | logged in |
| GET | `/api/bookings/my` | logged in |
| DELETE | `/api/bookings/{id}` (cancel, restores seats) | owner or ADMIN |
| GET | `/api/bookings` | ADMIN |
| POST | `/api/hotel-bookings` `{hotelId, checkIn, checkOut, rooms}` | logged in |
| GET | `/api/hotel-bookings/my` | logged in |
| DELETE | `/api/hotel-bookings/{id}` (cancel, frees rooms) | owner or ADMIN |
| GET | `/api/hotel-bookings` | ADMIN |
| GET | `/api/users` (no password data) | ADMIN |

Send `Authorization: Bearer <token>` on protected calls.

## Sample data
`scripts/seed.ps1` logs in as admin and adds 12 trips and 12 hotels (run it once):
```
powershell -ExecutionPolicy Bypass -File scripts\seed.ps1 -BaseUrl http://localhost:8081
```

## Deployment
1. **Infrastructure:** `cd infra && terraform init && terraform apply` creates the EC2 instance (Ubuntu 24.04, Docker installed on first boot), an Elastic IP, a key pair and a security group.
2. **DNS:** point an A record for your domain at the Elastic IP, then set the domain in `deploy/Caddyfile` and `CORS_ORIGIN` in `deploy/docker-compose.prod.yml`. Caddy requests and renews the TLS certificate automatically. Ports 80 and 443 must be open in the security group.
3. **GitHub Actions secrets:** `EC2_HOST`, `EC2_SSH_KEY`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`.
4. **CI/CD:** every push to `main` runs CI (`mvn verify` plus a Docker build). When CI passes, the Deploy workflow builds the API and web images, pushes them to GHCR, copies the compose and Caddy files to the server over SSH, and runs `docker compose up -d`. It can also be started manually.

## Design notes
- **No overbooking:** trip seats are changed under a pessimistic row lock, so two people can't take the last seat.
- **Per-night hotel availability:** a hotel stay is accepted only if every night of the stay has enough free rooms. The hotel row is locked while checking, and cancelled stays stop counting automatically.
- Passwords are BCrypt-hashed, JWTs are stateless, and all queries are parameterized through Spring Data JPA.
- Registration only creates USER accounts; the first admin is seeded from environment variables.
- The Nginx proxy exposes only the API and Swagger; the Actuator endpoints stay internal.

## Roadmap
- [x] Hotel booking (date ranges, rooms, per-night availability)
- [x] React frontend
- [x] Deploy to AWS EC2 with Terraform + GitHub Actions CD
- [x] Custom domain with automatic HTTPS
- [ ] Manage the HTTPS (443) firewall rule in Terraform
- [ ] Image URL field for trips and hotels
- [ ] Prometheus + Grafana dashboard
