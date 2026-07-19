# FastAPI to Next.js Migration Plan

## Completed in this pass

1. Created a Prisma schema for `Client`, `Lead`, `Appointment`, `Conversation`, and `KnowledgeDocument`.
2. Added Next.js route handlers for chat, leads, appointments, knowledge uploads, conversations, and dashboard stats.
3. Moved RAG, embedding, document extraction, and email delivery logic into `src/lib`.
4. Updated the widget page and dashboard pages to consume the new Next API.
5. Added a production-oriented folder structure under `frontend/src/`.

## Remaining deployment steps

1. Install the new dependencies in `frontend/package.json`.
2. Run `prisma migrate dev` or `prisma migrate deploy` against Neon.
3. Configure `DATABASE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and `CLINIC_OWNER_EMAIL`.
4. Replace the temporary clinic slug lookup defaults with your real tenant provisioning flow.
5. Wire Better Auth into the dashboard session flow if you want to fully replace the current cookie-based login.

