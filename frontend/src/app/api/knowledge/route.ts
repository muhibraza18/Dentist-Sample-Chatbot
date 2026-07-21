import { NextResponse } from "next/server";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import type { KnowledgeDocument } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { prisma } = await import("@/lib/prisma");
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  const docs = await prisma.knowledgeDocument.findMany({
    where: { clientId: clinic.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    docs.map((doc: KnowledgeDocument) => ({
      ...doc,
      embedding: Array.isArray(doc.embedding) ? doc.embedding : [],
      createdAt: doc.createdAt.toISOString(),
    }))
  );
}
