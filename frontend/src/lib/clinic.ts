export async function getClinicBySlug(clientSlug: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.client.findUnique({ where: { clientSlug } });
}

export async function ensureDefaultClinic() {
  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.client.findFirst({ where: { clientSlug: "default" } });
  if (existing) return existing;
  return prisma.client.create({
    data: {
      clientSlug: "default",
      clinicName: "Default Dental Clinic",
      clinicEmail: "owner@example.com",
      clinicPhone: "+1-555-0100",
    },
  });
}
