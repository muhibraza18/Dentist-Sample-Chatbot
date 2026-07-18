from __future__ import annotations

import traceback

from app.repositories.appointment_repository import AppointmentRepository
from app.services.email_service import send_appointment_notification


class AppointmentService:
    def __init__(self, appointment_repo: AppointmentRepository):
        self.appointment_repo = appointment_repo

    def create_appointment(self, data: dict) -> object:
        appointment = self.appointment_repo.create(**data)
        print("[APPOINTMENT] saved_to_postgresql =", appointment.id, flush=True)
        try:
            print(
                "[APPOINTMENT] calling send_appointment_notification()",
                {
                    "patient_name": appointment.name,
                    "patient_phone": appointment.phone,
                    "patient_email": appointment.email,
                    "service": appointment.service,
                    "appointment_date": appointment.appointment_date,
                    "appointment_time": appointment.appointment_time,
                },
                flush=True,
            )
            response = send_appointment_notification(
                patient_name=appointment.name,
                patient_phone=appointment.phone,
                patient_email=appointment.email,
                service=appointment.service,
                appointment_date=appointment.appointment_date,
                appointment_time=appointment.appointment_time,
            )
            print("[APPOINTMENT] send_appointment_notification response =", response, flush=True)
        except Exception as exc:
            print("[RESEND_EMAIL_FAILED]", repr(exc), flush=True)
            print(traceback.format_exc(), flush=True)
        return appointment
