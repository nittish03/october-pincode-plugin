import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prismaGlobal ?? new PrismaClient();

globalForPrisma.prismaGlobal = prisma;

export default prisma;
