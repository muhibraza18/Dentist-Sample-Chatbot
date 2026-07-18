from pathlib import Path
import sys

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        populate_by_name=True,
    )

    database_url: str = Field(default="", alias="DATABASE_URL")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    resend_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("RESEND_API_KEY", "Resend_API_KEY"),
    )
    email_from: str = Field(default="onboarding@resend.dev", alias="EMAIL_FROM")
    clinic_owner_email: str = Field(default="", alias="CLINIC_OWNER_EMAIL")
    app_base_url: str = Field(default="http://localhost:8000", alias="APP_BASE_URL")

    @model_validator(mode="after")
    def validate_required(self):
        missing = []
        if not self.database_url:
            missing.append("DATABASE_URL")
        if not self.groq_api_key:
            missing.append("GROQ_API_KEY")
        if missing:
            raise ValueError(
                "Missing required environment variables: " + ", ".join(missing)
            )
        return self

    @property
    def env_file_path(self) -> Path:
        return BACKEND_DIR / ".env"

    @property
    def python_version(self) -> str:
        return sys.version.split()[0]


settings = Settings()
