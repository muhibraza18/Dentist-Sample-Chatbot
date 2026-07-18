from sqlalchemy.orm import Session

from app.db.models import Lead


class LeadRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **data) -> Lead:
        lead = Lead(**data)
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def list_by_client(self, client_id: int) -> list[Lead]:
        return self.db.query(Lead).filter(Lead.client_id == client_id).order_by(Lead.id.desc()).all()

