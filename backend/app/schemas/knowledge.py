from pydantic import BaseModel


class KnowledgeSearchRequest(BaseModel):
    client_id: int
    query: str

