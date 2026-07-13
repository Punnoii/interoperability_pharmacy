import { PrismaClient } from "@prisma/client";

// stash the client on globalThis so hot-reload in dev reuses one connection pool instead of leaking a new one each time
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// reuse the cached client if present; verbose query logging in dev, quiet in prod
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query"],
  });

// only cache in dev — prod starts fresh per process and shouldn't touch the global
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
