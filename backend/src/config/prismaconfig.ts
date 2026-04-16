import { PrismaClient } from "@prisma/client";

// Prisma Client configuration optimized for serverless (Vercel)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" 
    ? ['warn', 'error'] 
    : ['query', 'info', 'warn', 'error'],
  // Optimize for serverless: reduce connection pool size
  // This helps prevent connection exhaustion in serverless environments
});

// Handle Prisma connection cleanup on serverless shutdown
if (process.env.NODE_ENV === "production") {
  // In serverless, ensure connections are properly closed
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;