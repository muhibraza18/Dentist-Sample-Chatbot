from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.db.session import SessionLocal
from app.repositories.client_repository import ClientRepository
from app.db.models import Client
from app.services.email_service import get_email_debug_info
from sqlalchemy.exc import OperationalError

app = FastAPI(title="Dental AI Receptionist API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.on_event("startup")
def log_embedding_configuration():
    service = EmbeddingService()
    print("[startup] embedding_model", service.model_name, flush=True)
    print("[startup] embedding_dimensions", service.dimensions, flush=True)
    print("[startup] database_url", settings.database_url, flush=True)
    print("[EMAIL CONFIG]", flush=True)
    debug = get_email_debug_info()
    print(f"RESEND_API_KEY loaded = {debug['loaded']}", flush=True)
    print(f"CLINIC_OWNER_EMAIL = {debug['recipient']}", flush=True)
    print(f"FROM_EMAIL = {debug['from_email']}", flush=True)
    print(f"ENV_FILE_PATH = {debug['env_file_path']}", flush=True)
    print(f"RESEND_VERSION = {debug['resend_version']}", flush=True)
    print(f"PYTHON_VERSION = {debug['python_version']}", flush=True)


@app.on_event("startup")
def seed_default_client():
    db = SessionLocal()
    try:
        repo = ClientRepository(db)
        try:
            client = repo.get_by_id(1)
            if client is None:
                db.add(
                    Client(
                        id=1,
                        clinic_name="Default Dental Clinic",
                        slug="default",
                        email="owner@example.com",
                        phone="+1-555-0100",
                    )
                )
                db.commit()
        except OperationalError as exc:
            print("[startup] database_unavailable", repr(exc), flush=True)
    finally:
        db.close()
