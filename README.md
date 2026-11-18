# EsenceLab

Resume in, structured skills out, job match computed, recruiter shortlist behind it.

Three deployables: a Next.js frontend, an Express API with JWT auth and RBAC, and a FastAPI service that parses resumes and matches them to jobs. Scoring is deterministic first, with an optional LLM assist.

TypeScript · Next.js · Express · FastAPI · PostgreSQL

## Run

```bash
cd frontend && npm ci && npm run dev
cd ../backend && npm ci && npm run dev
cd ../ai-service && pip install -r requirements.txt && uvicorn app.main:app --port 3102
```

Configure `JWT_SECRET`, `AI_INTERNAL_AUTH_TOKEN`, and `SUPABASE_*` from the `.env.example` files.

## Test

```bash
cd backend && npm run test:all
cd ../ai-service && python -m unittest tests.smoke_test
```

Architecture notes live in [docs](docs/ARCHITECTURE.md).
