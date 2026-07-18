from __future__ import annotations

import re
from dataclasses import dataclass
import traceback
from datetime import date, datetime as dt, time
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
try:
    import dateparser
except Exception:  # pragma: no cover
    dateparser = None

from app.db.session import get_db
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.knowledge_repository import KnowledgeRepository
from app.repositories.lead_repository import LeadRepository
from app.schemas.common import AppointmentCreate, ChatRequest, ChatResponse, KnowledgeUpload, LeadCreate
from app.schemas.knowledge import KnowledgeSearchRequest
from app.services.appointment_service import AppointmentService
from app.services.agent_service import AgentService
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService
from app.services.email_service import get_email_debug_info, send_appointment_notification
from app.core.config import settings

router = APIRouter()
BOOKING_SESSIONS: dict[tuple[int, str], "BookingState"] = {}

APPOINTMENT_INTENT_PATTERNS = [
    "appointment",
    "book an appointment",
    "book appointment",
    "schedule a consultation",
    "schedule consultation",
    "see a dentist",
    "book a visit",
    "need to see a dentist",
    "schedule a visit",
]
APPOINTMENT_SUCCESS_MESSAGE = (
    "Thank you. Your appointment request has been submitted successfully. "
    "Our team will contact you shortly."
)


@dataclass
class BookingState:
    booking_step: str = "idle"
    booking_data: dict[str, str] | None = None
    awaiting_confirmation: bool = False

    def __post_init__(self):
        if self.booking_data is None:
            self.booking_data = {}

    @property
    def active(self) -> bool:
        return self.booking_step != "idle"

    @property
    def name(self) -> str:
        return self.booking_data.get("name", "")

    @property
    def phone(self) -> str:
        return self.booking_data.get("phone", "")

    @property
    def email(self) -> str:
        return self.booking_data.get("email", "")

    @property
    def service(self) -> str:
        return self.booking_data.get("service", "")

    @property
    def appointment_date(self) -> str:
        return self.booking_data.get("appointment_date", "")

    @property
    def appointment_time(self) -> str:
        return self.booking_data.get("appointment_time", "")

    def reset(self) -> None:
        self.booking_step = "idle"
        self.booking_data = {}
        self.awaiting_confirmation = False

    def set_step(self, step: str) -> None:
        self.booking_step = step

    def update(self, **kwargs: str) -> None:
        self.booking_data.update({key: value for key, value in kwargs.items() if value})

    def as_log(self) -> dict[str, object]:
        return {
            "booking_step": self.booking_step,
            "booking_data": self.booking_data,
            "awaiting_confirmation": self.awaiting_confirmation,
        }


def _normalize(text: str) -> str:
    return " ".join(text.lower().strip().split())


def _is_appointment_intent(text: str) -> bool:
    normalized = _normalize(text)
    return any(pattern in normalized for pattern in APPOINTMENT_INTENT_PATTERNS)


def _extract_email(text: str) -> str:
    match = re.search(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})", text)
    return match.group(1).strip() if match else ""


def _extract_phone(text: str) -> str:
    match = re.search(r"(\+?\d[\d\s().-]{6,}\d)", text)
    return re.sub(r"\s+", "", match.group(1)).strip() if match else ""


def _extract_date(text: str) -> str:
    text = text.strip()
    patterns = [
        r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b",
        r"\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:,\s*\d{4})?\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",
        r"\btomorrow\b",
        r"\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return ""


def _extract_time(text: str) -> str:
    match = re.search(r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b", text, re.IGNORECASE)
    if match:
        return match.group(0).strip().upper()
    match = re.search(r"\b\d{2}:\d{2}\b", text)
    return match.group(0).strip() if match else ""


def _guess_name(text: str) -> str:
    if _is_appointment_intent(text):
        return ""
    cleaned = _extract_email(text)
    if cleaned:
        text = text.replace(cleaned, " ")
    phone = _extract_phone(text)
    if phone:
        text = re.sub(re.escape(phone), " ", text)
    text = re.sub(r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", " ", text)
    text = re.sub(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", " ", text)
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)
    if not words or any(token.lower() in {"appointment", "book", "schedule", "consult", "visit", "whitening"} for token in words[:2]):
        return ""
    candidate = " ".join(words[:4]).strip()
    if len(candidate.split()) < 2:
        return ""
    return candidate


def _extract_service(text: str) -> str:
    lowered = text.lower()
    service_keywords = [
        "cleaning",
        "consultation",
        "implant",
        "braces",
        "filling",
        "root canal",
        "extraction",
        "whitening",
        "checkup",
        "visit",
        "dental",
    ]
    for keyword in service_keywords:
        if keyword in lowered:
            return text.strip()
    return ""

def _get_booking_state(client_id: int, session_id: str) -> BookingState:
    key = (client_id, session_id)
    if key not in BOOKING_SESSIONS:
        BOOKING_SESSIONS[key] = BookingState()
    return BOOKING_SESSIONS[key]


def _parse_date(value: str) -> date:
    value = value.strip()
    if dateparser is not None:
        parsed = dateparser.parse(
            value,
            settings={
                "PREFER_DATES_FROM": "future",
                "RELATIVE_BASE": dt.now(),
            },
        )
        if parsed:
            return parsed.date()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%B %d, %Y", "%B %d", "%b %d, %Y", "%b %d"):
        try:
            parsed = date.fromisoformat(value) if fmt == "%Y-%m-%d" else dt.strptime(value, fmt).date()
            if fmt in {"%B %d", "%b %d"}:
                parsed = parsed.replace(year=date.today().year)
            return parsed
        except Exception:
            continue
    raise ValueError("Invalid appointment date")


def _parse_time(value: str) -> time:
    cleaned = value.strip().upper().replace(" ", "")
    for fmt in ("%H:%M", "%I%p", "%I:%M%p"):
        try:
            return dt.strptime(cleaned, fmt).time()
        except Exception:
            continue
    raise ValueError("Invalid appointment time")


def _format_time_for_summary(value: str) -> str:
    parsed = _parse_time(value)
    hour = parsed.hour % 12 or 12
    minute = f"{parsed.minute:02d}"
    suffix = "AM" if parsed.hour < 12 else "PM"
    return f"{hour}:{minute} {suffix}"


def _format_date_for_summary(value: str) -> str:
    return _parse_date(value).isoformat()


def _appointment_booking_prompt(step: str) -> str:
    if step == "collect_contact":
        return "Please provide your full name, phone number, and email address."
    if step == "collect_service_datetime":
        return "What service do you need and what date/time would you prefer?"
    if step == "awaiting_confirmation":
        return "Confirm? (yes/no)"
    return ""


def _build_appointment_data(client_id: int, state: BookingState) -> dict:
    appointment_date = _parse_date(state.appointment_date)
    appointment_time = _parse_time(state.appointment_time)
    return {
        "client_id": client_id,
        "name": state.name.strip(),
        "phone": state.phone.strip(),
        "email": state.email.strip(),
        "service": state.service.strip(),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "status": "pending",
    }


def _collect_contact_info(message: str) -> dict[str, str]:
    return {
        "name": _guess_name(message),
        "phone": _extract_phone(message),
        "email": _extract_email(message),
    }


def _missing_field_message(fields: list[str]) -> str:
    labels = {
        "name": "name",
        "phone": "phone number",
        "email": "email address",
        "service": "service",
        "appointment_date": "appointment date",
        "appointment_time": "appointment time",
    }
    if not fields:
        return ""
    if len(fields) == 1:
        return f"I could not detect your {labels[fields[0]]}."
    parts = [labels[field] for field in fields]
    if len(parts) == 2:
        return f"I could not detect your {parts[0]} and {parts[1]}."
    return "I could not detect your " + ", ".join(parts[:-1]) + f", and {parts[-1]}."


def _collect_appointment_details(message: str) -> dict[str, str]:
    print("[BOOKING STEP 2]")
    print("message =", message)
    date_value = _extract_date(message)
    time_value = _extract_time(message)
    cleaned = message
    if date_value:
        cleaned = re.sub(re.escape(date_value), " ", cleaned, flags=re.IGNORECASE)
    if time_value:
        cleaned = re.sub(re.escape(time_value), " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(re.escape(time_value.replace(" ", "")), " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:am|pm)\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.-")
    service = cleaned.strip()
    print("parsed_service =", service)
    print("parsed_date =", date_value)
    print("parsed_time =", time_value)
    return {
        "service": service,
        "appointment_date": date_value,
        "appointment_time": time_value,
    }


def _validate_booking_step2(extracted: dict[str, str]) -> list[str]:
    missing = []
    if not extracted.get("service"):
        missing.append("service")
    if not extracted.get("appointment_date"):
        missing.append("appointment_date")
    if not extracted.get("appointment_time"):
        missing.append("appointment_time")
    print(
        "[BOOKING]",
        f"service={extracted.get('service', '')}",
        f"date={extracted.get('appointment_date', '')}",
        f"time={extracted.get('appointment_time', '')}",
        flush=True,
    )
    if missing:
        print("[BOOKING] validation_failed =", missing, flush=True)
    return missing


def _booking_missing_fields(state: BookingState) -> list[str]:
    missing = []
    for field in ["name", "phone", "email", "service", "appointment_date", "appointment_time"]:
        if not state.booking_data.get(field):
            missing.append(field)
    return missing


def _build_summary(state: BookingState) -> str:
    return (
        "Appointment Summary\n\n"
        f"Name: {state.name}\n"
        f"Phone: {state.phone}\n"
        f"Email: {state.email}\n"
        f"Service: {state.service}\n"
        f"Date: {_format_date_for_summary(state.appointment_date)}\n"
        f"Time: {_format_time_for_summary(state.appointment_time)}\n\n"
        "Confirm? (yes/no)"
    )


def _persist_booking_state(client_id: int, session_id: str, state: BookingState) -> None:
    BOOKING_SESSIONS[(client_id, session_id)] = state
    print("[BOOKING] updated_state =", state, flush=True)


def save_booking_state(client_id: int, session_id: str, state: BookingState) -> None:
    _persist_booking_state(client_id, session_id, state)


def resolve_client(db: Session, client_id: int):
    client = ClientRepository(db).get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("/test-email")
def test_email():
    print("[TEST_EMAIL]", flush=True)
    print("[EMAIL CONFIG]", flush=True)
    debug = get_email_debug_info()
    print(f"env_var={debug['env_var']}", flush=True)
    print(f"loaded={debug['loaded']}", flush=True)
    print(f"prefix={debug['prefix']}", flush=True)
    print(f"starts_with_re={debug['starts_with_re']}", flush=True)
    print("CLINIC_OWNER_EMAIL =", settings.clinic_owner_email, flush=True)
    print("FROM_EMAIL =", settings.email_from, flush=True)
    try:
        response = send_appointment_notification(
            patient_name="Test Patient",
            patient_phone="5551234567",
            patient_email="test@example.com",
            service="Test Service",
            appointment_date="2026-07-20",
            appointment_time="15:00",
        )
        print("[TEST_EMAIL] resend_response =", response, flush=True)
        return {"success": True, "message": "Email sent", "resend_response": response}
    except Exception as exc:
        print("[TEST_EMAIL] failed =", repr(exc), flush=True)
        print(traceback.format_exc(), flush=True)
        return {"success": False, "message": str(exc)}


@router.get("/email-debug")
def email_debug():
    debug = get_email_debug_info()
    return {
        "loaded": debug["loaded"],
        "prefix": debug["prefix"],
        "starts_with_re": debug["starts_with_re"],
        "from_email": debug["from_email"],
        "recipient": debug["recipient"],
    }


@router.get("/debug/resend")
def debug_resend():
    debug = get_email_debug_info()
    return {
        "env_loaded": debug["loaded"],
        "api_key_length": debug["api_key_length"],
        "api_key_prefix": debug["prefix"],
        "email_from": debug["from_email"],
        "clinic_owner_email": debug["recipient"],
        "resend_version": debug["resend_version"],
        "env_file_path": debug["env_file_path"],
        "python_version": debug["python_version"],
    }


def _local_chat_reply(message: str) -> str:
    text = message.strip().lower()
    if any(token in text for token in ["appointment", "book", "schedule", "visit"]):
        return "I can help with an appointment request. Please share your name, phone number, email, preferred date, and preferred time."
    if any(token in text for token in ["callback", "call me back", "contact me", "reach me"]):
        return "Please share your name, phone number, email, and the service you need."
    if any(token in text for token in ["consultation", "consult", "second opinion"]):
        return "I can help with a consultation request. Please share your name, phone number, email, and the service you need."
    if "implant" in text:
        return "Yes, dental implants are a common dental service. If you'd like, I can help you request a consultation."
    if any(token in text for token in ["what kind of services", "what services", "what do you offer", "what do you provide", "services"]):
        return "We can help with dental cleanings, fillings, implants, braces, and other common dental services."
    if any(token in text for token in ["insurance", "billing", "covered"]):
        return "Insurance coverage depends on the clinic's policy. Please ask the clinic owner for details."
    if any(token in text for token in ["hours", "open", "close", "time"]):
        return "Hi, I'm the dental receptionist. I can help with services, office hours, insurance basics, and appointment questions."
    return "Hi, I'm the dental receptionist. How can I help you today?"


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    print(f"[chat] payload={payload.model_dump()}", flush=True)
    client = ClientRepository(db).get_by_slug(payload.client_slug)
    if not client:
        raise HTTPException(status_code=404, detail="Clinic not found")

    convo_repo = ConversationRepository(db)
    convo_repo.create(client_id=client.id, session_id=payload.session_id, message=payload.message, role="user")
    history_rows = convo_repo.list_by_session(client.id, payload.session_id)
    history_messages = [
        {"role": row.role, "content": row.message}
        for row in history_rows[:-1]
        if row.role in {"user", "assistant"}
    ]
    print("[chat] user_question", payload.message, flush=True)

    booking_state = _get_booking_state(client.id, payload.session_id)
    print("[SESSION]", payload.session_id, flush=True)
    print("[HISTORY_COUNT]", len(history_rows), flush=True)
    print("[LAST_MESSAGES]", history_rows[-5:] if history_rows else [], flush=True)
    print("[BOOKING] current_state =", booking_state, flush=True)
    print("[BOOKING] user_message =", payload.message, flush=True)
    print("[Appointment] state_before", booking_state.as_log(), flush=True)

    if _is_appointment_intent(payload.message) and booking_state.booking_step == "idle":
        booking_state.set_step("collect_contact")
        save_booking_state(client.id, payload.session_id, booking_state)
        print("[Appointment] intent_detected", booking_state.as_log(), flush=True)
        reply = _appointment_booking_prompt(booking_state.booking_step)
        convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
        return ChatResponse(reply=reply)

    if booking_state.booking_step != "idle":
        normalized = _normalize(payload.message)
        print("[Appointment] active_message", {"message": payload.message, "step": booking_state.booking_step}, flush=True)

        if booking_state.awaiting_confirmation:
            if normalized in {"yes", "y", "confirm", "confirmed", "ok", "okay"}:
                try:
                    appointment_data = _build_appointment_data(client.id, booking_state)
                    print(
                        "[Appointment]",
                        {
                            "Patient": appointment_data["name"],
                            "Service": appointment_data["service"],
                            "Date": str(appointment_data["appointment_date"]),
                            "Time": str(appointment_data["appointment_time"]),
                            "Email": appointment_data["email"],
                        },
                        flush=True,
                    )
                    service = AppointmentService(AppointmentRepository(db))
                    appointment = service.create_appointment(appointment_data)
                    print("[Appointment] created", {"id": appointment.id}, flush=True)
                    booking_state.reset()
                    save_booking_state(client.id, payload.session_id, booking_state)
                    convo_repo.create(
                        client_id=client.id,
                        session_id=payload.session_id,
                        message=APPOINTMENT_SUCCESS_MESSAGE,
                        role="assistant",
                    )
                    return ChatResponse(reply=APPOINTMENT_SUCCESS_MESSAGE)
                except Exception as exc:
                    print("[Appointment] validation_error", repr(exc), flush=True)
                    reply = "I couldn't submit the appointment request. Please check the date and time format and try again."
                    convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
                    return ChatResponse(reply=reply)
            if normalized in {"no", "n", "cancel", "stop"}:
                booking_state.reset()
                save_booking_state(client.id, payload.session_id, booking_state)
                reply = "Appointment booking canceled."
                convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
                return ChatResponse(reply=reply)
            reply = "Please reply yes or no."
            convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
            return ChatResponse(reply=reply)

        if booking_state.booking_step == "collect_contact":
            extracted = _collect_contact_info(payload.message)
            print("[BOOKING] extracted_name =", extracted["name"], flush=True)
            print("[BOOKING] extracted_phone =", extracted["phone"], flush=True)
            print("[BOOKING] extracted_email =", extracted["email"], flush=True)
            print("[STATE TRANSITION]")
            old_step = booking_state.booking_step
            if extracted["name"] and extracted["phone"] and extracted["email"]:
                booking_state.booking_data["name"] = extracted["name"]
                booking_state.booking_data["phone"] = extracted["phone"]
                booking_state.booking_data["email"] = extracted["email"]
                booking_state.booking_step = "collect_service_datetime"
                print("FROM =", old_step)
                print("TO =", booking_state.booking_step)
                print("[Appointment] contact_collected", booking_state.as_log(), flush=True)
                save_booking_state(client.id, payload.session_id, booking_state)
                reply = _appointment_booking_prompt("collect_service_datetime")
            else:
                booking_state.booking_data["name"] = extracted["name"] or booking_state.booking_data.get("name", "")
                booking_state.booking_data["phone"] = extracted["phone"] or booking_state.booking_data.get("phone", "")
                booking_state.booking_data["email"] = extracted["email"] or booking_state.booking_data.get("email", "")
                missing_parts = []
                if not extracted["name"]:
                    missing_parts.append("name")
                if not extracted["phone"]:
                    missing_parts.append("phone")
                if not extracted["email"]:
                    missing_parts.append("email")
                reply = _missing_field_message(missing_parts)
            print("[Appointment] state_after_contact", booking_state.as_log(), flush=True)
            save_booking_state(client.id, payload.session_id, booking_state)
            convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
            return ChatResponse(reply=reply)

        if booking_state.booking_step == "collect_service_datetime":
            extracted = _collect_appointment_details(payload.message)
            missing = _validate_booking_step2(extracted)
            if missing:
                reply = _missing_field_message(missing)
                save_booking_state(client.id, payload.session_id, booking_state)
                convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
                return ChatResponse(reply=reply)
            booking_state.update(**extracted)
            print("[Appointment] details_collected", booking_state.as_log(), flush=True)
            booking_state.set_step("awaiting_confirmation")
            booking_state.awaiting_confirmation = True
            reply = _build_summary(booking_state)
            print("[Appointment] summary_ready", booking_state.as_log(), flush=True)
            save_booking_state(client.id, payload.session_id, booking_state)
            convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
            return ChatResponse(reply=reply)

    rag_rows = KnowledgeRepository(db).search_with_scores(client.id, EmbeddingService().embed(payload.message), limit=5)
    retrieved_chunks = [row.content for row, _score in rag_rows]
    similarity_scores = [score for _row, score in rag_rows]
    context = "\n\n".join(retrieved_chunks)

    print("[RAG] Question:", payload.message, flush=True)
    print("[RAG] Retrieved Chunks:", retrieved_chunks, flush=True)
    print("[RAG] Similarity Scores:", similarity_scores, flush=True)
    print("[RAG] Context Length:", len(context), flush=True)
    print("[chat] session_history", history_messages, flush=True)

    if not retrieved_chunks:
        reply = "I don't have that information in my knowledge base."
        print("[chat] no_retrieval_reply", reply, flush=True)
    else:
        reply = AgentService().answer(history_messages, context, payload.message)

    print(f"[chat] reply={reply}", flush=True)
    convo_repo.create(client_id=client.id, session_id=payload.session_id, message=reply, role="assistant")
    print("[chat] returning_response", flush=True)
    return ChatResponse(reply=reply)


@router.post("/lead")
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    resolve_client(db, payload.client_id)
    return LeadRepository(db).create(**payload.model_dump())


@router.post("/appointments")
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    client = resolve_client(db, payload.client_id)
    service = AppointmentService(AppointmentRepository(db))
    appointment = service.create_appointment(payload.model_dump())
    print(
        "[Appointment]",
        {
            "Patient": appointment.name,
            "Service": appointment.service,
            "Date": str(appointment.appointment_date),
            "Time": str(appointment.appointment_time),
        },
        flush=True,
    )
    return appointment


@router.post("/knowledge/upload")
def upload_knowledge(payload: KnowledgeUpload, db: Session = Depends(get_db)):
    resolve_client(db, payload.client_id)
    embedding_service = EmbeddingService()
    embedding = embedding_service.embed(payload.content)
    print("[knowledge] runtime_embedding_dimensions", {"dimensions": len(embedding)}, flush=True)
    doc = KnowledgeRepository(db).create(client_id=payload.client_id, content=payload.content, embedding=embedding)
    return {"id": doc.id, "client_id": doc.client_id, "content": doc.content}


@router.post("/knowledge/upload-file")
async def upload_knowledge_file(
    client_id: Annotated[int, Form()],
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    print(
        "[knowledge] upload_file_request",
        {"client_id": client_id, "filename": file.filename, "content_type": file.content_type},
        flush=True,
    )
    print("[knowledge] upload_file_read_start", flush=True)
    content = await file.read()
    print("[knowledge] upload_file_read_done", {"size": len(content)}, flush=True)
    text = DocumentService().extract_text(file.filename or "upload.txt", content)
    print("[knowledge] upload_file_extract_done", {"text_length": len(text)}, flush=True)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file")
    embedding = EmbeddingService().embed(text)
    print("[knowledge] runtime_embedding_dimensions", {"dimensions": len(embedding)}, flush=True)
    print("[knowledge] upload_file_db_write_start", flush=True)
    doc = KnowledgeRepository(db).create(client_id=client_id, content=text, embedding=embedding)
    print("[knowledge] upload_file_saved", {"id": doc.id, "client_id": doc.client_id}, flush=True)
    return {"id": doc.id, "client_id": doc.client_id, "content": doc.content}


@router.get("/appointments")
def list_appointments(client_id: int, q: str | None = None, db: Session = Depends(get_db)):
    resolve_client(db, client_id)
    rows = AppointmentRepository(db).list_by_client(client_id)
    if q:
        q = q.lower()
        rows = [row for row in rows if q in row.name.lower() or q in row.email.lower() or q in row.phone.lower() or q in row.service.lower()]
    return rows


@router.get("/leads")
def list_leads(client_id: int, q: str | None = None, db: Session = Depends(get_db)):
    resolve_client(db, client_id)
    rows = LeadRepository(db).list_by_client(client_id)
    if q:
        q = q.lower()
        rows = [row for row in rows if q in row.name.lower() or q in row.email.lower() or q in row.phone.lower() or q in row.service_requested.lower()]
    return rows


@router.get("/conversations")
def list_conversations(client_id: int, db: Session = Depends(get_db)):
    resolve_client(db, client_id)
    return ConversationRepository(db).list_by_client(client_id)


@router.get("/knowledge")
def list_knowledge(client_id: int, db: Session = Depends(get_db)):
    resolve_client(db, client_id)
    rows = KnowledgeRepository(db).list_by_client(client_id)
    return [{"id": row.id, "client_id": row.client_id, "content": row.content} for row in rows]


@router.post("/knowledge/search")
def search_knowledge(payload: KnowledgeSearchRequest, db: Session = Depends(get_db)):
    resolve_client(db, payload.client_id)
    rag_rows = KnowledgeRepository(db).search_with_scores(payload.client_id, EmbeddingService().embed(payload.query), limit=5)
    return [
        {
            "content": content,
            "similarity": similarity,
        }
        for content, similarity in rag_rows
    ]
