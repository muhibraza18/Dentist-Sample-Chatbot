import { NextResponse } from "next/server";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import { extractTextFromFile } from "@/lib/document";
import { embedText } from "@/lib/embedding";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const clientSlug = String(formData.get("clientSlug") ?? "default");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a PDF, DOCX, or TXT file." }, { status: 400 });
  }
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractTextFromFile(file.name, buffer);
  if (!text) return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
  const doc = await prisma.knowledgeDocument.create({
    data: {
      clientId: clinic.id,
      fileName: file.name,
      content: text,
      embedding: embedText(text),
      sourceType: "file",
    },
  });
  return NextResponse.json({
    id: doc.id,
    clientId: doc.clientId,
    content: doc.content,
    fileName: doc.fileName,
  });
}
