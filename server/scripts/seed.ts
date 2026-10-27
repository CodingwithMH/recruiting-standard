import { prisma } from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("[seed] Initializing platform administrator seed routine.");

  const adminEmail = "admin@therecruitingstandard.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("PlatformAdmin2026!", 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: "Platform",
        lastName: "Admin",
        globalRole: "PLATFORM_ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`[seed] Created platform administrator account: ${admin.email}`);
  } else {
    console.log(`[seed] Platform administrator account already exists: ${existingAdmin.email}`);
  }

  console.log("[seed] Platform seed routine finished successfully.");
}

main()
  .catch((e) => {
    console.error("[seed] Platform seed execution encountered an error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
