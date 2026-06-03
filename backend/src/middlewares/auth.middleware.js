const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'my_secret_key';

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Bạn chưa đăng nhập'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Bạn không có quyền admin'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
};

module.exports = {
  verifyAdmin
};
