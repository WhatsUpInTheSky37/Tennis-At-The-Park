import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  // Seed locations
  const cityPark = await prisma.location.upsert({
    where: { id: 'city-park-courts' },
    update: {},
    create: { id: 'city-park-courts', name: 'City Park Courts', lighted: true, courtCount: 4 }
  })
  const winterplace = await prisma.location.upsert({
    where: { id: 'winterplace-park-courts' },
    update: {},
    create: { id: 'winterplace-park-courts', name: 'Winterplace Park Courts', lighted: false, courtCount: 2 }
  })
  console.log('Seeded locations:', cityPark.name, winterplace.name)

  // Seed admin user
  const hash = await argon2.hash('admin1234')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ultimatetennis.app' },
    update: {},
    create: {
      email: 'admin@ultimatetennis.app',
      passwordHash: hash,
      isAdmin: true,
      profile: { create: { displayName: 'Admin' } },
      rating: { create: {} },
      enforcement: { create: {} }
    }
  })
  console.log('Admin user:', admin.email)
}

main().catch(console.error).finally(() => prisma.$disconnect())
