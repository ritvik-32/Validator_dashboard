// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { QueryTypes } = require('sequelize');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

exports.register = async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  // Prevent creating admin via register
  const userRole = role === 'admin' ? 'user' : (role || 'user');

  try {
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(409).json({ error: 'username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password_hash: hash,
      role: userRole,
      approved: false // must be approved by admin
    });

    return res.status(201).json({ message: 'Registered. Awaiting admin approval.' });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Only allow login if approved OR admin
    if (!user.approved && user.role !== 'admin') {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role, approved: user.approved } });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
};
