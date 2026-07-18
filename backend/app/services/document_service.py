from pathlib import Path
from io import BytesIO

from docx import Document as DocxDocument
from pypdf import PdfReader


class DocumentService:
    def extract_text(self, filename: str, content: bytes) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix == ".pdf":
            reader = PdfReader(BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        if suffix == ".docx":
            tmp_path = Path("/tmp") / filename
            tmp_path.write_bytes(content)
            doc = DocxDocument(str(tmp_path))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        return content.decode("utf-8", errors="ignore").strip()
