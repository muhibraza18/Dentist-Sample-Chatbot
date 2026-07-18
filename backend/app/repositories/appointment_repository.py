from sqlalchemy.orm import Session

from app.db.models import Appointment


class AppointmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **data) -> Appointment:
        appointment = Appointment(**data)
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def list_by_client(self, client_id: int) -> list[Appointment]:
        return self.db.query(Appointment).filter(Appointment.client_id == client_id).order_by(Appointment.id.desc()).all()
