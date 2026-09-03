import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Use the Neon pooled connection string (hostname includes -pooler).",
    );
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const prisma = globalForPrisma.prismaGlobal ?? createPrismaClient();

globalForPrisma.prismaGlobal = prisma;

export default prisma;
