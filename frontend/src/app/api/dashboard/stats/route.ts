import { NextResponse } from "next/server";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { prisma } = await import("@/lib/prisma");
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  const [appointments, leads, conversations, knowledgeDocuments] = await Promise.all([
    prisma.appointment.count({ where: { clientId: clinic.id } }),
    prisma.lead.count({ where: { clientId: clinic.id } }),
    prisma.conversation.count({ where: { clientId: clinic.id } }),
    prisma.knowledgeDocument.count({ where: { clientId: clinic.id } }),
  ]);
  return NextResponse.json({
    clinic,
    appointments,
    leads,
    conversations,
    knowledgeDocuments,
  });
}
