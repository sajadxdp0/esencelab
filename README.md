# EsenceLab

**Multi-service hiring platform: resume parsing, deterministic skill matching, and recruiter shortlists.**

EsenceLab is built as three deployable services: a Next.js App Router frontend, a TypeScript/Express API that owns authentication and role-based access control, and a Python/FastAPI service that parses PDF resumes and scores candidate-to-job matches. Match scoring is deterministic first—combining normalized skill overlap (`0.55`) with TF-IDF cosine similarity (`0.45`)—with an optional LLM assist and a local fallback so the product works without external AI keys.

## Design notes

- **Authorization in the API tier.** Supabase provides managed PostgreSQL, while the Express API enforces JWT authentication and role guards (`student`, `recruiter`, `admin`). Recruiter accounts go through a gated request-and-approval flow rather than open self-signup.
- **Deterministic scoring before LLM calls.** Resume parsing and job matching return structured output and explained scores using local text extraction and TF-IDF even when no LLM key is configured or the upstream provider times out.
- **Bounded service-to-service calls.** The Express backend calls the FastAPI service over HTTP with an `x-internal-service-token` header and explicit request timeouts.
- **Modularized codebases.** Backend routes, domain services, and state live in focused modules under `backend/src/`; the AI service splits parsing, TF-IDF matching, schemas, and routes under `ai-service/app/`.

## Stack

TypeScript · Next.js · Express · Python · FastAPI · PostgreSQL (Supabase) · Docker

## Where to look

- `backend/src/routes/` and `backend/src/services/` — RBAC-guarded route handlers and domain logic
- `backend/src/auth/roles.ts` & `backend/test/rbac-smoke.test.js` — role permissions and the contract tests that enforce them
- `ai-service/app/parsing.py` & `ai-service/app/matching.py` — PDF resume extraction and skill-overlap + TF-IDF scoring
- `frontend/src/app/(dashboard)/` — role-specific dashboards, resume upload, and candidate ranking views

## Running locally

```bash
# Frontend (port 3000)
cd frontend && npm ci && npm run dev

# Backend API (port 3001)
cd backend && npm ci && npm run dev

# AI service (port 3102)
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --port 3102
```

Copy `.env.example` in each service and set `JWT_SECRET`, `AI_INTERNAL_AUTH_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.

## Testing

```bash
cd backend && npm run test:all
cd ../ai-service && python -m unittest tests.smoke_test
cd ../frontend && npm run build
```

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md) · [Runbook](docs/RUNBOOK.md) · [Scaling](docs/SCALING.md) · [Testing](docs/TESTING.md) · [Contributing](CONTRIBUTING.md)

MIT License.
