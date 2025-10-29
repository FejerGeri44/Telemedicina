module.exports = function requireRole(...allowed) {
  return (req, res, next) => {
    const r = req.user?.role;
    if (!r || !allowed.includes(r)) {
      return res.status(403).json({ message: 'Nincs jogosultság.' });
    }
    next();
  };
};
