const { PrismaClient } = require("@prisma/client");

// Single shared Prisma instance across the app (prevents connection
// exhaustion in dev with hot-reload).
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
