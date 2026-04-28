import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

async function requireAdmin(req: any, reply: any) {
  if (!req.user?.isAdmin) return reply.status(403).send({ error: 'Admin only' })
}

async function deleteUserCascade(userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Forum posts owned by user (with their replies, reactions, notifications, reports)
    const userPosts = await tx.forumPost.findMany({ where: { userId }, select: { id: true } })
    const userPostIds = userPosts.map(p => p.id)
    if (userPostIds.length) {
      const repliesOnUserPosts = await tx.forumReply.findMany({ where: { postId: { in: userPostIds } }, select: { id: true } })
      const replyIdsOnUserPosts = repliesOnUserPosts.map(r => r.id)
      if (replyIdsOnUserPosts.length) {
        await tx.forumReaction.deleteMany({ where: { replyId: { in: replyIdsOnUserPosts } } })
        await tx.notification.deleteMany({ where: { replyId: { in: replyIdsOnUserPosts } } })
        await tx.report.updateMany({ where: { forumReplyId: { in: replyIdsOnUserPosts } }, data: { forumReplyId: null } })
      }
      await tx.forumReply.deleteMany({ where: { postId: { in: userPostIds } } })
      await tx.forumReaction.deleteMany({ where: { postId: { in: userPostIds } } })
      await tx.notification.deleteMany({ where: { postId: { in: userPostIds } } })
      await tx.report.updateMany({ where: { forumPostId: { in: userPostIds } }, data: { forumPostId: null } })
      await tx.forumPost.deleteMany({ where: { id: { in: userPostIds } } })
    }

    // 2. User's own forum replies (on others' posts)
    const userReplies = await tx.forumReply.findMany({ where: { userId }, select: { id: true } })
    const userReplyIds = userReplies.map(r => r.id)
    if (userReplyIds.length) {
      await tx.forumReaction.deleteMany({ where: { replyId: { in: userReplyIds } } })
      await tx.notification.deleteMany({ where: { replyId: { in: userReplyIds } } })
      await tx.report.updateMany({ where: { forumReplyId: { in: userReplyIds } }, data: { forumReplyId: null } })
      await tx.forumReply.deleteMany({ where: { id: { in: userReplyIds } } })
    }

    // 3. User's reactions on other people's content
    await tx.forumReaction.deleteMany({ where: { userId } })

    // 4. Notifications addressed to or from user
    await tx.notification.deleteMany({ where: { OR: [{ userId }, { fromUserId: userId }] } })

    // 5. Direct messages
    await tx.directMessage.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } })

    // 6. Reports
    await tx.report.updateMany({ where: { reportedUser: userId }, data: { reportedUser: null } })
    await tx.report.deleteMany({ where: { reporterUser: userId } })

    // 7. Disputes opened by user
    await tx.dispute.deleteMany({ where: { openedBy: userId } })

    // 8. Session messages, participants, invites, challenges
    const userMessages = await tx.message.findMany({ where: { fromUser: userId }, select: { id: true } })
    const userMessageIds = userMessages.map(m => m.id)
    if (userMessageIds.length) {
      await tx.report.updateMany({ where: { messageId: { in: userMessageIds } }, data: { messageId: null } })
      await tx.message.deleteMany({ where: { id: { in: userMessageIds } } })
    }
    await tx.sessionParticipant.deleteMany({ where: { userId } })
    await tx.invite.deleteMany({ where: { OR: [{ fromUser: userId }, { toUser: userId }] } })
    await tx.challenge.deleteMany({ where: { OR: [{ challengerId: userId }, { challengedId: userId }] } })

    // 9. Sessions created by user (and everything inside them)
    const userSessions = await tx.session.findMany({ where: { createdBy: userId }, select: { id: true } })
    const userSessionIds = userSessions.map(s => s.id)
    if (userSessionIds.length) {
      const sessionMessages = await tx.message.findMany({ where: { sessionId: { in: userSessionIds } }, select: { id: true } })
      const sessionMessageIds = sessionMessages.map(m => m.id)
      if (sessionMessageIds.length) {
        await tx.report.updateMany({ where: { messageId: { in: sessionMessageIds } }, data: { messageId: null } })
        await tx.message.deleteMany({ where: { id: { in: sessionMessageIds } } })
      }
      await tx.invite.deleteMany({ where: { sessionId: { in: userSessionIds } } })
      await tx.sessionParticipant.deleteMany({ where: { sessionId: { in: userSessionIds } } })
      await tx.match.updateMany({ where: { sessionId: { in: userSessionIds } }, data: { sessionId: null } })
      await tx.session.deleteMany({ where: { id: { in: userSessionIds } } })
    }

    // 10. 1:1 records
    await tx.enforcement.deleteMany({ where: { userId } })
    await tx.rating.deleteMany({ where: { userId } })
    await tx.profile.deleteMany({ where: { userId } })

    // 11. Finally: the user
    await tx.user.delete({ where: { id: userId } })
  })
}

export async function adminRoutes(server: FastifyInstance) {
  const preHandler = [(server as any).authenticate, requireAdmin]

  server.get('/users', { preHandler }, async (req) => {
    const q = req.query as any
    const search = (q.search || '').trim()
    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { displayName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    return prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, email: true, isAdmin: true, lastActive: true, createdAt: true,
        profile: true,
        rating: true,
        enforcement: true,
        _count: {
          select: {
            forumPosts: true, forumReplies: true,
            sessionsCreated: true, sessionParticipants: true,
            challengesSent: true, challengesReceived: true,
            reportsAgainst: true,
          },
        },
      },
    })
  })

  server.get('/users/:id', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, isAdmin: true, lastActive: true, createdAt: true,
        profile: true,
        rating: true,
        enforcement: true,
        forumPosts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, subject: true, createdAt: true, _count: { select: { replies: true } } },
        },
        sessionsCreated: {
          orderBy: { startTime: 'desc' },
          take: 10,
          select: { id: true, startTime: true, format: true, status: true, location: { select: { name: true } } },
        },
        _count: {
          select: {
            forumPosts: true, forumReplies: true,
            sessionsCreated: true, sessionParticipants: true,
            challengesSent: true, challengesReceived: true,
            reportsAgainst: true, reportsFiled: true,
            dmsSent: true, dmsReceived: true,
          },
        },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  server.post('/users/:id/toggle-admin', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const me = (req as any).user
    if (id === me.userId) return reply.status(400).send({ error: 'Cannot change your own admin status' })
    const u = await prisma.user.findUnique({ where: { id }, select: { isAdmin: true } })
    if (!u) return reply.status(404).send({ error: 'User not found' })
    return prisma.user.update({ where: { id }, data: { isAdmin: !u.isAdmin } })
  })

  server.delete('/users/:id', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const me = (req as any).user
    if (id === me.userId) return reply.status(400).send({ error: 'Cannot delete yourself' })
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!target) return reply.status(404).send({ error: 'User not found' })
    await deleteUserCascade(id)
    return { ok: true }
  })

  server.get('/reports', { preHandler }, async (req) => {
    const q = req.query as any
    const where: any = {}
    if (q.status) where.status = q.status
    return prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reporter:   { select: { id: true, profile: { select: { displayName: true } } } },
        reported:   { select: { id: true, profile: { select: { displayName: true } } } },
        forumPost:  { select: { id: true, subject: true, body: true } },
        forumReply: { select: { id: true, postId: true, body: true } },
      },
    })
  })

  server.post('/reports/:id/resolve', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    return prisma.report.update({ where: { id }, data: { status } })
  })

  server.post('/users/:id/warn', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { notes } = req.body as { notes?: string }
    return prisma.enforcement.upsert({
      where: { userId: id },
      update: { warningCount: { increment: 1 }, notes: notes || '' },
      create: { userId: id, warningCount: 1, notes: notes || '' }
    })
  })

  server.post('/users/:id/suspend', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { suspended, notes } = req.body as { suspended: boolean, notes?: string }
    return prisma.enforcement.upsert({
      where: { userId: id },
      update: { suspended, notes: notes || '' },
      create: { userId: id, suspended, notes: notes || '' }
    })
  })

  server.post('/disputes/:id/resolve', { preHandler }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status, adminNote } = req.body as { status: string, adminNote?: string }
    const dispute = await prisma.dispute.update({ where: { id }, data: { status } })
    if (status === 'resolved') {
      await prisma.match.update({ where: { id: dispute.matchId }, data: { status: 'normal' } })
    }
    return dispute
  })

  server.get('/disputes', { preHandler }, async () => {
    return prisma.dispute.findMany({
      where: { status: 'open' },
      include: { match: true, opener: { select: { id: true, profile: { select: { displayName: true } } } } },
      orderBy: { createdAt: 'asc' }
    })
  })
}
