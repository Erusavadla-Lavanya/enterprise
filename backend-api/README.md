# HRMS Backend API

NestJS + Prisma backend for the HRMS micro-frontends.

## Setup

1. Copy `.env.example` to `.env` and update `DATABASE_URL` for PostgreSQL.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npm run prisma:migrate -- --name init`.
5. Run `npm run start:dev`.

The API runs on port `4000` by default and allows browser requests from the frontend development servers on ports `3000` through `3004`.

## Resources

- `GET|POST /auth`, `GET|PATCH|DELETE /auth/:id`
- `GET|POST /employees`, `GET|PATCH|DELETE /employees/:id`
- `GET|POST /payroll`, `GET|PATCH|DELETE /payroll/:id`
- `GET|POST /attendance`, `GET|PATCH|DELETE /attendance/:id`
