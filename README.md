# Napiwek

Public website for the Napiwek chess club. Visitors browse tournament results and stats. There is no login. The operator adds a finished tournament later through a token-protected API.

## Run locally

Local and production both use [Neon](https://neon.tech) Postgres. No Docker.

1. `npm install`
2. Create a free Neon project. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` — pooled connection string (host contains `-pooler`)
   - `DATABASE_URL_UNPOOLED` — direct connection string
   - `UPLOAD_TOKEN` — a long random secret
3. `npm run db:migrate`
4. `npm run dev`

Open [http://localhost:3000](http://localhost:3000).

