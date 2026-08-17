const jwt = require('jsonwebtoken');
const userService = require('../services/user.service');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

const signToken = (user, expiresIn) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn },
);

const authResponse = (message, user, expiresIn = '7d') => ({
  message,
  token: signToken(user, expiresIn),
  user,
});

const loginAdmin = async (req, res) => {
  if (!String(req.body?.email || '').trim() || !String(req.body?.password || '').trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ trường thông tin' });
  }

  const result = await userService.authenticateUser(req.body);

  if (result.data?.role === 'admin') {
    return res.json(authResponse('Đăng nhập admin thành công', result.data, '1d'));
  }

  return res.status(result.status === 400 ? 400 : 401).json({ error: 'Tài khoản hoặc mật khẩu sai' });
};

const registerUser = async (req, res) => {
  const result = await userService.createUser(req.body);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });

  return res.status(201).json(authResponse('Đăng ký thành công', result.data));
};

const loginUser = async (req, res) => {
  const result = await userService.authenticateUser(req.body);
  if (result.error) return res.status(result.status || 401).json({ error: result.error });

  return res.json(authResponse('Đăng nhập thành công', result.data));
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Không tìm thấy tài khoản' });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

module.exports = { loginAdmin, registerUser, loginUser, getCurrentUser };
