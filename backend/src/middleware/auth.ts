import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

export async function checkEnforcement(userId: string, reply: FastifyReply): Promise<boolean> {
  const enf = await prisma.enforcement.findUnique({ where: { userId } })
  if (!enf) return true
  if (enf.suspended) {
    reply.status(403).send({ error: 'Your account is suspended. Contact support.' })
    return false
  }
  if (enf.cooldownUntil && enf.cooldownUntil > new Date()) {
    reply.status(403).send({ error: `You are in cooldown until ${enf.cooldownUntil.toISOString()}` })
    return false
  }
  return true
}
