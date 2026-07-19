# AI Receptionist for Dental Clinics

This repository is being migrated from a split Next.js + FastAPI stack into a single Next.js 15 full-stack app.

## New stack

- Next.js 15 App Router
- TypeScript
- Route Handlers and Server Components
- Prisma
- PostgreSQL on Neon
- Resend for email
- OpenAI SDK for chat

## Current structure

- `frontend/` contains the Next.js app, API routes, Prisma schema, and widget
- `backend/` is the legacy FastAPI app being retired

## Migration notes

- Prisma schema: `frontend/prisma/schema.prisma`
- API routes: `frontend/src/app/api/**/route.ts`
- Shared server utilities: `frontend/src/lib/`
- Migration checklist: `MIGRATION_PLAN.md`

## Deployment target

- Vercel
- Neon
- Resend
