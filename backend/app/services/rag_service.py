from app.repositories.knowledge_repository import KnowledgeRepository
from app.services.embedding_service import EmbeddingService


class RagService:
    def __init__(self, knowledge_repo: KnowledgeRepository, embedding_service: EmbeddingService):
        self.knowledge_repo = knowledge_repo
        self.embedding_service = embedding_service

    def retrieve_context(self, client_id: int, query: str) -> str:
        query_embedding = self.embedding_service.embed(query)
        docs = self.knowledge_repo.search(client_id=client_id, query_embedding=query_embedding)
        return "\n\n".join(doc.content for doc in docs)

    def retrieve_context_with_scores(
        self, client_id: int, query: str, limit: int = 5
    ) -> list[tuple[str, float]]:
        query_embedding = self.embedding_service.embed(query)
        rows = self.knowledge_repo.search_with_scores(client_id=client_id, query_embedding=query_embedding, limit=limit)
        return [(doc.content, score) for doc, score in rows]
