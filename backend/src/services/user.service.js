const crypto = require('crypto');
const prisma = require('../lib/prisma');

const PASSWORD_ITERATIONS = 210000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = 'sha512';
const PASSWORD_PREFIX = 'pbkdf2';

class UserInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const toApiRole = (role) => role === 'ADMIN' ? 'admin' : 'user';
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: toApiRole(user.role),
});

function derivePassword(password, salt, iterations = PASSWORD_ITERATIONS) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(String(password), salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST, (error, hash) => {
      if (error) return reject(error);
      resolve(hash);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await derivePassword(password, salt);
  return `${PASSWORD_PREFIX}$${PASSWORD_ITERATIONS}$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [prefix, iterationsText, salt, expectedHash] = String(passwordHash || '').split('$');
  const iterations = Number(iterationsText);

  if (prefix !== PASSWORD_PREFIX || !Number.isInteger(iterations) || iterations <= 0 || !salt || !expectedHash) {
    return false;
  }

  const actualHash = await derivePassword(password, salt, iterations);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  return expectedBuffer.length === actualHash.length && crypto.timingSafeEqual(actualHash, expectedBuffer);
}

function validateRegistration(payload) {
  const name = String(payload?.name || '').trim();
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || '');

  if (!name || !email || !password) {
    throw new UserInputError(400, 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserInputError(400, 'Email không hợp lệ');
  }
  if (password.length < 6) {
    throw new UserInputError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
  }

  return { name, email, password };
}

function toServiceError(error) {
  if (error instanceof UserInputError) return { status: error.status, error: error.message };
  if (error?.code === 'P2002') return { status: 409, error: 'Email đã được đăng ký' };
  return { status: 500, error: 'Không thể xử lý tài khoản' };
}

async function createUser(payload) {
  try {
    const input = validateRegistration(payload);
    const existedUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existedUser) return { status: 409, error: 'Email đã được đăng ký' };

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'CUSTOMER' },
    });
    return { data: publicUser(user) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function authenticateUser(payload) {
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || '');

  if (!email || !password) return { status: 401, error: 'Sai email hoặc mật khẩu' };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { status: 401, error: 'Sai email hoặc mật khẩu' };
    }
    return { data: publicUser(user) };
  } catch (error) {
    return toServiceError(error);
  }
}

async function getUserById(id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  return user ? publicUser(user) : null;
}

module.exports = { createUser, authenticateUser, getUserById, hashPassword, normalizeEmail };
