import { PrismaClient } from "@prisma/client";

function getNormalizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase connection pooler in serverless environments (Vercel) must use
  // transaction mode on port 6543 with pgbouncer=true to avoid EMAXCONNSESSION (max 15 clients limit on 5432).
  if (url.includes("pooler.supabase.com")) {
    if (url.includes(":5432")) {
      url = url.replace(":5432", ":6543");
    }
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    if (!url.includes("connection_limit=")) {
      url += "&connection_limit=10";
    }
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const normalizedDbUrl = getNormalizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: normalizedDbUrl ? { db: { url: normalizedDbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
