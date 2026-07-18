from __future__ import annotations

from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

import httpx
from groq import Groq

from app.core.config import settings

client = Groq(api_key=settings.groq_api_key, http_client=httpx.Client(timeout=30.0))
_groq_executor = ThreadPoolExecutor(max_workers=2)


SYSTEM_PROMPT = """
You are an AI receptionist for a dental clinic.
Answer strictly from the provided knowledge base context and conversation history.
Do not use outside knowledge.
If the knowledge base does not contain the answer, say:
"I don't have that information in my knowledge base."

Be concise and professional.
"""


def build_messages(system_prompt: str, history: list[dict[str, str]], context: str, message: str) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append(
        {
            "role": "system",
            "content": (
                "Retrieved knowledge base context:\n"
                f"{context}\n\n"
                "Use only this context to answer. If it is not sufficient, say you don't have that information in your knowledge base."
            ),
        }
    )
    messages.append({"role": "user", "content": message})
    return messages


@dataclass
class AgentService:
    def answer(self, session_history: list[dict[str, str]], context: str, message: str) -> str:
        if not context.strip():
            print("[RAG] no_context_found", flush=True)
            return "I don't have that information in my knowledge base."

        messages = build_messages(SYSTEM_PROMPT, session_history, context, message)
        print("[chat] final_prompt", messages, flush=True)
        try:
            future = _groq_executor.submit(
                client.chat.completions.create,
                model=settings.groq_model,
                messages=messages,
                temperature=0.2,
            )
            response = future.result(timeout=12)
            text = (response.choices[0].message.content or "").strip()
            if not text:
                text = "I don't have that information in my knowledge base."
            print("[chat] groq_response", {"text": text}, flush=True)
            return text
        except FutureTimeoutError:
            print("[chat] groq_timeout", flush=True)
            return "I don't have that information in my knowledge base."
        except Exception as exc:
            print("[chat] groq_error", repr(exc), flush=True)
            return "I don't have that information in my knowledge base."
