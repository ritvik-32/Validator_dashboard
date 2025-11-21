// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_change_me';

exports.authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });

    const token = auth.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Enforce admin approval for non-admins
    if (user.role !== 'admin' && !user.approved) {
      return res.status(403).json({ error: 'User not approved by admin yet' });
    }

    req.user = { id: user.id, username: user.username, role: user.role, approved: user.approved };
    next();
  } catch (e) {
    console.error('Authenticate middleware error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};
