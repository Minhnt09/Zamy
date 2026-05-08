const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Bạn chưa đăng nhập'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, 'my_secret_key');

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