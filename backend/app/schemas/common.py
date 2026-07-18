from datetime import date, time

from pydantic import BaseModel, EmailStr, Field


class ChatRequest(BaseModel):
    client_slug: str
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str


class LeadCreate(BaseModel):
    client_id: int
    name: str
    email: EmailStr
    phone: str
    service_requested: str


class AppointmentCreate(BaseModel):
    client_id: int
    name: str
    phone: str
    email: EmailStr
    service: str
    appointment_date: date
    appointment_time: time
    status: str = "pending"


class KnowledgeUpload(BaseModel):
    client_id: int
    content: str = Field(min_length=1)
