from sqlalchemy.orm import Session

from app.db.models import Conversation


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **data) -> Conversation:
        convo = Conversation(**data)
        self.db.add(convo)
        self.db.commit()
        self.db.refresh(convo)
        return convo

    def list_by_session(self, client_id: int, session_id: str) -> list[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.client_id == client_id, Conversation.session_id == session_id)
            .order_by(Conversation.id.asc())
            .all()
        )

    def list_by_client(self, client_id: int, limit: int = 200) -> list[Conversation]:
        return (
            self.db.query(Conversation)
            .filter(Conversation.client_id == client_id)
            .order_by(Conversation.id.desc())
            .limit(limit)
            .all()
        )
