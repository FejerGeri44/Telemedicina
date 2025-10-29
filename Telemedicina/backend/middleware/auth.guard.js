const jwt = require('jsonwebtoken');

module.exports.authGuard = async (req, res, next) => {
  const token = req.cookies?.[process.env.COOKIE_NAME];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (_) { }
  }

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (bearer) {
    try {
      const decoded = jwt.verify(bearer, process.env.SUPABASE_JWT_SECRET);
      req.user = { authUid: decoded.sub, email: decoded.email, source: 'supabase' };
      return next();
    } catch (_) {
    }
  }

  return res.status(401).json({ message: 'Nincs vagy érvénytelen token.' });
};
