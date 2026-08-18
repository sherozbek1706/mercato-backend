const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded; // { id, username }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Avtorizatsiya xatosi, yaroqsiz token' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Avtorizatsiya xatosi, token yoq' });
  }
};

const isAdmin = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Ruxsat etilmagan (Admin emas)' });
      }
      req.user = decoded;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Avtorizatsiya xatosi, yaroqsiz token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Avtorizatsiya xatosi, token yoq' });
  }
};

module.exports = { protect, isAdmin };
