# Travel Management System: REST API

Spring Boot 3 · Java 17 · Spring Security + JWT · JPA/MySQL · Docker · GitHub Actions · Prometheus metrics

## Run locally
**Docker (recommended):** `docker compose up --build` → API on http://localhost:8080
**Without Docker:** start MySQL, then `mvn spring-boot:run` (defaults are in `application.properties`).

Swagger UI: http://localhost:8080/swagger-ui.html · Health: `/actuator/health` · Metrics: `/actuator/prometheus`

Default admin (dev only): `admin@travel.com` / `Admin@12345`. Override `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` and `DB_*` env vars in any real deployment.

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

Send `Authorization: Bearer <token>` on protected calls.

## Design notes
- Seats are updated under a pessimistic row lock, so two users can't book the last seat.
- Passwords are BCrypt-hashed; all queries are parameterized via Spring Data JPA.
- Registration only creates USER accounts; the first admin is seeded from env vars.

## Roadmap
- [ ] Hotel booking (rooms, dates, availability): build it yourself, following `BookingService`
- [ ] React frontend
- [ ] Deploy to AWS EC2 with Terraform + GitHub Actions CD
- [ ] Prometheus + Grafana dashboard
