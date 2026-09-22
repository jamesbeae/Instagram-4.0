# Backend setup

## Requirements

- Node.js 18+
- Docker Desktop

## Local PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

Copy `.env.example` to `.env` inside this directory, then install dependencies and run migrations:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Health check:

```text
GET http://localhost:8000/health
```

The old MongoDB files remain temporarily while the remaining services are migrated to Sequelize.
