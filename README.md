# EsenceLab

Resume parsing, skill matching, recruiter shortlists.

TypeScript · Next.js · Express · FastAPI · PostgreSQL

A Next.js frontend, an RBAC API, and a Python service for resume parse and job match.

```bash
cd frontend && npm ci && npm run dev
cd backend && npm ci && npm run dev
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --port 3102
```

Tests: `cd backend && npm run test:all`
