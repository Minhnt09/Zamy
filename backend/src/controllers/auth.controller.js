const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin123';

const loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: 'Sai email hoặc mật khẩu'
    });
  }

  const token = jwt.sign(
    {
      email: ADMIN_EMAIL,
      role: 'admin'
    },
    process.env.JWT_SECRET || 'my_secret_key',
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

module.exports = {
  loginAdmin
};