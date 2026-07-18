from __future__ import annotations

from importlib.metadata import version
import traceback

import resend

from app.core.config import settings


def get_email_debug_info() -> dict[str, object]:
    key = settings.resend_api_key or ""
    prefix = key[:8]
    return {
        "env_var": "RESEND_API_KEY",
        "loaded": bool(key),
        "prefix": prefix,
        "starts_with_re": key.startswith("re_"),
        "from_email": settings.email_from,
        "recipient": settings.clinic_owner_email,
        "api_key_length": len(key),
        "api_key_suffix": key[-4:] if key else "",
        "env_file_path": str(settings.env_file_path),
        "python_version": settings.python_version,
        "resend_version": version("resend"),
    }


def _log_email_config(payload: dict) -> None:
    debug = get_email_debug_info()
    print("[EMAIL DEBUG]", flush=True)
    print(f"env_var={debug['env_var']}", flush=True)
    print(f"loaded={debug['loaded']}", flush=True)
    print(f"prefix={debug['prefix']}", flush=True)
    print(f"starts_with_re={debug['starts_with_re']}", flush=True)
    print(f"api_key_length={debug['api_key_length']}", flush=True)
    print(f"api_key_suffix={debug['api_key_suffix']}", flush=True)
    print(f"env_file_path={debug['env_file_path']}", flush=True)
    print(f"python_version={debug['python_version']}", flush=True)
    print(f"resend_version={debug['resend_version']}", flush=True)
    print("[EMAIL] Clinic owner email loaded =", bool(settings.clinic_owner_email), flush=True)
    print("[EMAIL] From email =", settings.email_from, flush=True)
    print("[EMAIL] Recipient email =", settings.clinic_owner_email, flush=True)
    print("[EMAIL] From email being used =", payload.get("from"), flush=True)
    print("[EMAIL] To email being used =", payload.get("to"), flush=True)
    print("[EMAIL] Resend SDK path = import resend; resend.api_key = settings.resend_api_key", flush=True)


def _resend_send(payload: dict) -> object:
    _log_email_config(payload)
    if not settings.resend_api_key:
        raise ValueError("RESEND_API_KEY is missing")
    try:
        resend.api_key = settings.resend_api_key
        response = resend.Emails.send(payload)
        print("[EMAIL] Resend API response =", response, flush=True)
        print("[RESEND_EMAIL_SENT]", flush=True)
        return response
    except Exception as exc:
        print("[RESEND_EMAIL_FAILED]", repr(exc), flush=True)
        print(traceback.format_exc(), flush=True)
        raise


def send_appointment_notification(
    patient_name: str,
    patient_phone: str,
    patient_email: str,
    service: str,
    appointment_date,
    appointment_time,
) -> object:
    body = (
        "New Appointment Request\n\n"
        f"Patient Name: {patient_name}\n"
        f"Phone: {patient_phone}\n"
        f"Email: {patient_email}\n\n"
        f"Service: {service}\n"
        f"Date: {appointment_date}\n"
        f"Time: {appointment_time}\n"
    )
    payload = {
        "from": settings.email_from,
        "to": [settings.clinic_owner_email],
        "subject": "New Appointment Request",
        "html": body.replace("\n", "<br>"),
    }
    return _resend_send(payload)
