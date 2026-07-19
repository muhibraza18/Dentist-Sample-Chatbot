import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function extractTextFromFile(fileName: string, bytes: Buffer) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const parsed = await pdf(bytes);
    return parsed.text.trim();
  }
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value.trim();
  }
  return bytes.toString("utf8").trim();
}

