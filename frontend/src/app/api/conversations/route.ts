import { NextResponse } from "next/server";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";

type ConversationRow = Awaited<ReturnType<typeof prisma.conversation.findMany>>[number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  const conversations = await prisma.conversation.findMany({
    where: { clientId: clinic.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    conversations.map((item: ConversationRow) => ({ ...item, createdAt: item.createdAt.toISOString() }))
  );
}
