const crypto = require('crypto');
const users = require('../data/user.data');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, 'sha512')
    .toString('hex');

  return { salt, hash };
};

const verifyPassword = (password, user) => {
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
};

const createUser = ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password) {
    return { status: 400, error: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { status: 400, error: 'Email không hợp lệ' };
  }

  if (String(password).length < 6) {
    return { status: 400, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }

  const existedUser = users.find(user => user.email === normalizedEmail);

  if (existedUser) {
    return { status: 409, error: 'Email đã được đăng ký' };
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: users.length ? Math.max(...users.map(item => item.id)) + 1 : 1,
    name: String(name).trim(),
    email: normalizedEmail,
    passwordSalt: salt,
    passwordHash: hash,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  users.push(user);

  return { data: publicUser(user) };
};

const authenticateUser = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = users.find(item => item.email === normalizedEmail);

  if (!user || !verifyPassword(password, user)) {
    return { status: 401, error: 'Sai email hoặc mật khẩu' };
  }

  return { data: publicUser(user) };
};

const getUserById = (id) => {
  const user = users.find(item => item.id === Number(id));
  return user ? publicUser(user) : null;
};

module.exports = {
  createUser,
  authenticateUser,
  getUserById
};
