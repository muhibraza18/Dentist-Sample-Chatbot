import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";
import { sendLeadNotification } from "@/lib/email";

type LeadRow = Awaited<ReturnType<typeof prisma.lead.findMany>>[number];

const schema = z.object({
  clientSlug: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  serviceRequested: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const clinic = (await getClinicBySlug(payload.clientSlug)) ?? (await ensureDefaultClinic());
  const lead = await prisma.lead.create({
    data: {
      clientId: clinic.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      serviceRequested: payload.serviceRequested,
    },
  });
  await sendLeadNotification({
    clinicName: clinic.clinicName,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    serviceRequested: payload.serviceRequested,
  });
  return NextResponse.json(lead);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  let leads = await prisma.lead.findMany({ where: { clientId: clinic.id }, orderBy: { createdAt: "desc" } });
  if (q) {
    leads = leads.filter(
      (lead: LeadRow) =>
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.serviceRequested.toLowerCase().includes(q)
    );
  }
  return NextResponse.json(leads);
}
