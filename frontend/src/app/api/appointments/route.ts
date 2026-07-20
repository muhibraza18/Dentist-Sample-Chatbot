import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultClinic, getClinicBySlug } from "@/lib/clinic";
import { sendAppointmentNotification } from "@/lib/email";
import { parseAppointmentDate, parseAppointmentTime } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  clientSlug: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  service: z.string().min(1),
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
  status: z.string().optional(),
});

export async function POST(request: Request) {
  const { prisma } = await import("@/lib/prisma");
  const payload = schema.parse(await request.json());
  const clinic = (await getClinicBySlug(payload.clientSlug)) ?? (await ensureDefaultClinic());
  const appointment = await prisma.appointment.create({
    data: {
      clientId: clinic.id,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      service: payload.service,
      appointmentDate: parseAppointmentDate(payload.appointmentDate),
      appointmentTime: parseAppointmentTime(payload.appointmentTime),
      status: payload.status ?? "pending",
    },
  });
  await sendAppointmentNotification({
    clinicName: clinic.clinicName,
    patientName: payload.name,
    patientEmail: payload.email,
    patientPhone: payload.phone,
    service: payload.service,
    appointmentDate: payload.appointmentDate,
    appointmentTime: payload.appointmentTime,
  });
  return NextResponse.json(appointment);
}

export async function GET(request: Request) {
  const { prisma } = await import("@/lib/prisma");
  const url = new URL(request.url);
  const clientSlug = url.searchParams.get("clientSlug") ?? "default";
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const clinic = (await getClinicBySlug(clientSlug)) ?? (await ensureDefaultClinic());
  let appointments = await prisma.appointment.findMany({ where: { clientId: clinic.id }, orderBy: { createdAt: "desc" } });
  if (q) {
    appointments = appointments.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q)
    );
  }
  return NextResponse.json(
    appointments.map((item) => ({
      ...item,
      appointmentDate: item.appointmentDate.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }))
  );
}
