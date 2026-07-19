import { NextResponse } from "next/server";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";

type KnowledgeRow = Awaited<ReturnType<typeof prisma.knowledgeDocument.findMany>>[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  const docs = await prisma.knowledgeDocument.findMany({
    where: { clientId: clinic.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    docs.map((doc: KnowledgeRow) => ({
      ...doc,
      embedding: Array.isArray(doc.embedding) ? doc.embedding : [],
      createdAt: doc.createdAt.toISOString(),
    }))
  );
}
