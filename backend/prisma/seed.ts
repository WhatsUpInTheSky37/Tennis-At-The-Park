import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Seed locations
  await prisma.location.upsert({
    where: { id: 'loc_citypark' },
    update: {},
    create: {
      id: 'loc_citypark',
      name: 'City Park Courts',
      lighted: true,
      courtCount: 4,
    },
  });

  await prisma.location.upsert({
    where: { id: 'loc_winterplace' },
    update: {},
    create: {
      id: 'loc_winterplace',
      name: 'Winterplace Park Courts',
      lighted: false,
      courtCount: 2,
    },
  });

  // Create admin user
  const adminHash = await argon2.hash('admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ultimatetennis.local' },
    update: {},
    create: {
      email: 'admin@ultimatetennis.local',
      passwordHash: adminHash,
      isAdmin: true,
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      displayName: 'Admin',
      skillLevel: 4.0,
      handedness: 'right',
      preferredFormats: ['singles', 'doubles'],
      bio: 'Site administrator',
    },
  });

  await prisma.rating.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  await prisma.enforcement.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log('Seed complete!');
  console.log('Admin email: admin@ultimatetennis.local');
  console.log('Admin password: admin123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
