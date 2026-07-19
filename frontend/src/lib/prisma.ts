import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function normalizeDatabaseUrl(url?: string) {
  if (!url) return url;
  if (url.startsWith("postgresql+psycopg://")) {
    return url.replace("postgresql+psycopg://", "postgresql://");
  }
  return url;
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
