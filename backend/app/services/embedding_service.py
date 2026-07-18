from __future__ import annotations

import hashlib
import math
import re


def _fallback_embed(text: str) -> list[float]:
    vector = [0.0] * 384
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "little") % 384
        weight = 1.0 + (len(token) / 10.0)
        vector[index] += weight
    norm = math.sqrt(sum(value * value for value in vector))
    if norm:
        vector = [value / norm for value in vector]
    return vector


class EmbeddingService:
    model_name = "hash-fallback-384"
    dimensions = 384

    def embed(self, text: str) -> list[float]:
        normalized = text.replace("\n", " ").strip()
        if not normalized:
            vector = [0.0] * self.dimensions
            print("[embedding] model", self.model_name, flush=True)
            print("[embedding] dimensions", len(vector), flush=True)
            return vector
        vector = _fallback_embed(normalized)
        print("[embedding] model", self.model_name, flush=True)
        print("[embedding] dimensions", len(vector), flush=True)
        return vector
