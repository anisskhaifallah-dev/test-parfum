import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // First admin account, so there's a way to log in at all. Change this password after
  // first login - it's only meant to get you into the (hidden) staff login the first time.
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@yyparfums.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: 'Admin',
        role: 'admin',
      },
    });
    console.log(`Created initial admin account: ${adminEmail} / ${adminPassword} (change this password)`);
  } else {
    console.log(`Admin account ${adminEmail} already exists, skipping.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
