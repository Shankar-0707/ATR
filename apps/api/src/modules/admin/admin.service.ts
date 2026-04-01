import { prisma } from "../../core/lib/prisma.js";

export async function getPlatformStats() {
  const [userCount, jobCount, byStatus, usageAgg] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.usageDaily.aggregate({
      _sum: {
        completed: true,
        failed: true,
        dead: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    byStatus.map((r: { status: string; _count: { _all: number } }) => [
      r.status,
      r._count._all,
    ]),
  ) as Record<string, number>;

  return {
    users: userCount,
    jobs: jobCount,
    jobsByStatus: statusMap,
    usageTotals: {
      completed: usageAgg._sum.completed ?? 0,
      failed: usageAgg._sum.failed ?? 0,
      dead: usageAgg._sum.dead ?? 0,
    },
  };
}

export async function listUsers(take: number, skip: number) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        plan: true,
        created_at: true,
        _count: { select: { jobs: true } },
      },
      orderBy: { created_at: "desc" },
      take,
      skip,
    }),
    prisma.user.count(),
  ]);
  return { items, total, take, skip };
}

export async function listAllJobs(
  take: number,
  skip: number,
  status?: string,
  userId?: string,
) {
  const where = {
    ...(status ? { status } : {}),
    ...(userId ? { user_id: userId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { created_at: "desc" },
      take,
      skip,
      include: {
        user: { select: { email: true, plan: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);
  return { items, total, take, skip };
}
