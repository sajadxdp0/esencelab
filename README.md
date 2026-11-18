# EsenceLab

Resume parsing, skill matching, and recruiter shortlists.

EsenceLab is a hiring platform split into three deployables: a Next.js frontend, an Express API with JWT auth and RBAC, and a FastAPI service that parses resumes and scores job matches. Matching is deterministic first, using skill overlap and TF-IDF, with an optional LLM assist and a local fallback.

## Features

- Student, recruiter, and admin roles with gated recruiter onboarding
- PDF resume upload and structured skill extraction
- Job CRUD, applications, and explained match scores
- Service-to-service auth for the AI parser
- Per-service Dockerfiles, CI checks, and managed PostgreSQL setup

## Stack

TypeScript · Next.js · Express · FastAPI · PostgreSQL (Supabase) · Docker

## Quick start

```bash
cd frontend && npm ci && npm run dev
cd ../backend && npm ci && npm run dev
cd ../ai-service && pip install -r requirements.txt && uvicorn app.main:app --port 3102
```

Copy each `.env.example` and set `JWT_SECRET`, `AI_INTERNAL_AUTH_TOKEN`, and `SUPABASE_*`.

## Tests

```bash
cd backend && npm run test:all
cd ../ai-service && python -m unittest tests.smoke_test
```

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) · [Testing](docs/TESTING.md) · [Contributing](CONTRIBUTING.md)
