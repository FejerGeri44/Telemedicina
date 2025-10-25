const jwt = require('jsonwebtoken');
const COOKIE_NAME = 'session';

function authGuard(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Hiányzó jogosultság.' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Érvénytelen vagy lejárt munkamenet.' });
  }
}

module.exports = { authGuard };
