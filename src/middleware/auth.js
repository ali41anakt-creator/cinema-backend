function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Алдымен жүйеге кіріңіз' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  res.status(403).json({ error: 'Тек админге рұқсат' });
}

module.exports = { requireLogin, requireAdmin };
