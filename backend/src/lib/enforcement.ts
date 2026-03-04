import { PrismaClient } from '@prisma/client';

export async function checkEnforcement(prisma: PrismaClient, userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const enf = await prisma.enforcement.findUnique({ where: { userId } });
  if (!enf) return { blocked: false };
  if (enf.suspended) return { blocked: true, reason: 'Your account has been suspended. Contact support.' };
  if (enf.cooldownUntil && enf.cooldownUntil > new Date()) {
    return { blocked: true, reason: `You are in a cooldown period until ${enf.cooldownUntil.toLocaleString()}. This was triggered by repeated late cancellations or no-shows.` };
  }
  return { blocked: false };
}

export async function ensureEnforcement(prisma: PrismaClient, userId: string) {
  await prisma.enforcement.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
