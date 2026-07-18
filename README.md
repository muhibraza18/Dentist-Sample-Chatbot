# AI Receptionist for Dental Clinics

Full-stack multi-tenant SaaS starter for a dental clinic AI receptionist.

## Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui-ready structure
- Backend: FastAPI, OpenAI, SQLAlchemy, Alembic
- Database: PostgreSQL + pgvector
- Email: built-in `smtplib`

## Folder Structure

- `backend/` FastAPI API, services, repositories, Alembic migrations
- `frontend/` Next.js admin dashboard and widget shell

## Core Features

- Multi-tenant data isolation via `client_id`
- AI receptionist chat endpoint
- RAG over clinic FAQs and services
- Lead capture
- Appointment requests
- SMTP appointment notifications
- Admin dashboard for leads, appointments, and knowledge uploads
- Embeddable widget entrypoint

## Backend Setup

1. Create a virtual environment.
2. Install backend dependencies from `backend/requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Set `DATABASE_URL`, `OPENAI_API_KEY`, and SMTP values.
5. Run migrations:

```bash
cd backend
alembic upgrade head
```

6. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Frontend Setup

1. Install dependencies in `frontend/`.
2. Set `NEXT_PUBLIC_API_BASE_URL` if your API is not on `http://localhost:8000`.
3. Start the app:

```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Vercel

- Deploy the `frontend/` app to Vercel.
- Set `NEXT_PUBLIC_API_BASE_URL` to the backend URL.

### Railway or Render

- Deploy `backend/` as a Python web service.
- Provision PostgreSQL with pgvector enabled.
- Run Alembic migrations during deploy.
- Set SMTP and OpenAI environment variables.

## Notes

- Dashboard access uses a secure cookie session at `/login` and `/api/login`.
- The widget is production-ready and accepts `data-client-slug` on the embed script.
