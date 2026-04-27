import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  const hashed = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where:  { username: "admin" },
    update: {},
    create: {
      username:  "admin",
      password:  hashed,
      fullName:  "Admin",
      role:      "Admin",
    },
  });
  console.log("✅ Admin seeded: admin / admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });