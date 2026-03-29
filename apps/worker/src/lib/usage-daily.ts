import { prisma } from "./prisma.js";

function utcDay(): Date {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export async function recordUsageOutcome(
  userId: string,
  outcome: "completed" | "failed" | "dead",
): Promise<void> {
  const day = utcDay();
  const field =
    outcome === "completed"
      ? "completed"
      : outcome === "failed"
        ? "failed"
        : "dead";
  await prisma.usageDaily.upsert({
    where: {
      user_id_day: { user_id: userId, day },
    },
    create: {
      user_id: userId,
      day,
      [field]: 1,
    },
    update: {
      [field]: { increment: 1 },
    },
  });
}
