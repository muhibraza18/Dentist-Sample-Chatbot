from pydantic import BaseModel


class MessageItem(BaseModel):
    role: str
    message: str


class ChatHistoryResponse(BaseModel):
    messages: list[MessageItem]

