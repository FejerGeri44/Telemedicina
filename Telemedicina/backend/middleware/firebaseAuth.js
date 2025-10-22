const { auth } = require('../models');
module.exports = async function authenticateFirebaseToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Hiányzó token.' });

    const decoded = await auth.verifyIdToken(token);
    req.user = { id: decoded.uid, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Érvénytelen token.' });
  }
};
