const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
  throw new Error('ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET must be configured');
}

const loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (!String(email || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({
      error: 'Vui lòng nhập đầy đủ trường thông tin'
    });
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: 'Tài khoản hoặc mật khẩu sai'
    });
  }

  const token = jwt.sign(
    {
      email: ADMIN_EMAIL,
      role: 'admin'
    },
    JWT_SECRET,
    {
      expiresIn: '1d'
    }
  );

  return res.json({
    message: 'Đăng nhập admin thành công',
    token,
    user: {
      email: ADMIN_EMAIL,
      role: 'admin'
    }
  });
};

const registerUser = (req, res) => {
  const result = userService.createUser(req.body);

  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  const token = jwt.sign(
    {
      id: result.data.id,
      email: result.data.email,
      role: 'user'
    },
    JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  return res.status(201).json({
    message: 'Đăng ký tài khoản thành công',
    token,
    user: result.data
  });
};

const loginUser = (req, res) => {
  const result = userService.authenticateUser(req.body);

  if (result.error) {
    return res.status(result.status || 401).json({ error: result.error });
  }

  const token = jwt.sign(
    {
      id: result.data.id,
      email: result.data.email,
      role: 'user'
    },
    JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  return res.json({
    message: 'Đăng nhập thành công',
    token,
    user: result.data
  });
};

const getCurrentUser = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);

    if (decoded.role !== 'user') {
      return res.status(403).json({ error: 'Token không hợp lệ cho user' });
    }

    const user = userService.getUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

module.exports = {
  loginAdmin,
  registerUser,
  loginUser,
  getCurrentUser
};
