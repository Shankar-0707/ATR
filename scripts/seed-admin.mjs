/**
 * seed-admin.mjs
 * Run once to create a hardcoded admin account in Neon DB.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Edit ADMIN_EMAIL and ADMIN_PASSWORD below before running.
 */

import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load the root .env so DATABASE is available
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

// ── ✏️  CONFIGURATION ──────────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌  Error: SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set in .env");
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.plan === "admin") {
      console.log(`✅  Admin already exists: ${ADMIN_EMAIL} (id: ${existing.id})`);
    } else {
      // Promote an existing regular account to admin
      const updated = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data:  { plan: "admin" },
        select: { id: true, email: true, plan: true },
      });
      console.log(`🔧  Promoted existing user to admin:`, updated);
    }
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email:    ADMIN_EMAIL,
      password: hash,
      plan:     "admin",
      // Create a default queue for the admin account too
      queues: {
        create: { name: "default", concurrency: 10, rate_limit_per_min: 60 },
      },
    },
    select: { id: true, email: true, plan: true },
  });

  console.log(`🎉  Admin created successfully:`, admin);
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
