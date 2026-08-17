import 'dotenv/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prisma = require('../src/lib/prisma');
const { hashPassword, normalizeEmail } = require('../src/services/user.service');

const email = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');

async function main() {
  if (!email || !password) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be configured');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is invalid');
  }
  if (password.length < 6) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 6 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin bootstrap skipped: user already exists for ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Administrator',
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  });
  console.log(`Admin bootstrap created: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
