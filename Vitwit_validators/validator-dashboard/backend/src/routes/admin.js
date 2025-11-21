// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// List users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id','username','role','approved','createdAt','updatedAt'], order: [['createdAt','DESC']] });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve user
router.post('/users/:id/approve', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.approved = true;
    await user.save();
    res.json({ message: 'User approved', user: { id: user.id, username: user.username, approved: user.approved } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke approval / disable user (optional)
router.post('/users/:id/revoke', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.approved = false;
    await user.save();
    res.json({ message: 'User approval revoked', user: { id: user.id, username: user.username, approved: user.approved } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
