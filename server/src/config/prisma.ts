import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const basePrisma =
  global.basePrismaInstance ||
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.basePrismaInstance = basePrisma;
}

function createPrismaWithRetry() {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          try {
            return await query(args);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const code =
              typeof err === "object" && err !== null && "code" in err
                ? (err as { code: string }).code
                : "";
            if (
              msg.includes("Server has closed the connection") ||
              msg.includes("Can't reach database server") ||
              msg.includes("Connection closed unexpectedly") ||
              code === "P1001" ||
              code === "P1017"
            ) {
              // Neon serverless / PgBouncer pooler connection recovery: retry once after 500ms
              await new Promise((resolve) => setTimeout(resolve, 500));
              return await query(args);
            }
            throw err;
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaWithRetry>;

declare global {
  // eslint-disable-next-line no-var
  var basePrismaInstance: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaInstance: ExtendedPrismaClient | undefined;
}

export const prisma: ExtendedPrismaClient =
  global.prismaInstance || createPrismaWithRetry();

if (env.NODE_ENV !== "production") {
  global.prismaInstance = prisma;
}
