from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import KnowledgeDocument


class KnowledgeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, client_id: int, content: str, embedding: list[float]) -> KnowledgeDocument:
        doc = KnowledgeDocument(client_id=client_id, content=content, embedding=embedding)
        self.db.add(doc)
        try:
            print("[knowledge] db_commit_start", flush=True)
            self.db.commit()
            print("[knowledge] db_commit_done", flush=True)
            self.db.refresh(doc)
            print("[knowledge] db_refresh_done", flush=True)
            return doc
        except Exception as exc:
            print("[knowledge] db_commit_error", repr(exc), flush=True)
            self.db.rollback()
            raise

    def search(self, client_id: int, query_embedding: list[float], limit: int = 5) -> list[KnowledgeDocument]:
        return (
            self.db.query(KnowledgeDocument)
            .filter(KnowledgeDocument.client_id == client_id)
            .order_by(KnowledgeDocument.embedding.cosine_distance(query_embedding))
            .limit(limit)
            .all()
        )

    def search_with_scores(
        self, client_id: int, query_embedding: list[float], limit: int = 5
    ) -> list[tuple[KnowledgeDocument, float]]:
        distance = KnowledgeDocument.embedding.cosine_distance(query_embedding).label("distance")
        rows = (
            self.db.query(KnowledgeDocument, distance)
            .filter(KnowledgeDocument.client_id == client_id)
            .order_by(distance)
            .limit(limit)
            .all()
        )
        return [(row[0], 1.0 - float(row[1])) for row in rows]

    def list_by_client(self, client_id: int) -> list[KnowledgeDocument]:
        return (
            self.db.query(KnowledgeDocument)
            .filter(KnowledgeDocument.client_id == client_id)
            .order_by(KnowledgeDocument.id.desc())
            .all()
        )
