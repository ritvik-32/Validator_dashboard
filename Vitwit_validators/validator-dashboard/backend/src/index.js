// index.js (update / merge with your existing file)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/database');
const networkRoutes = require('./routes/networks');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const User = require('./models/User');
const { authenticate } = require('./middleware/auth');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// mount auth routes (no auth required)
app.use('/api/auth', authRoutes);

// admin routes (require admin auth inside file)
app.use('/api/admin', adminRoutes);

// protect /api/networks with authentication middleware
app.use('/api/networks', authenticate, networkRoutes);

app.get('/', (req, res) => {
  res.send('Validator Dashboard API is running...');
});

const testConnection = async () => {
  try {
    await db.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

const ensureAdmin = async () => {
  // Admin credentials can be set via env, otherwise defaults below (change for production)
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminRole = 'admin';

  try {
    // create users table if not exists using Sequelize sync
    await User.sync(); // safe for dev; in prod use migrations

    const existing = await User.findOne({ where: { username: adminUsername } });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      await User.create({
        username: adminUsername,
        password_hash: hash,
        role: adminRole,
        approved: true // admin is approved by default
      });
      console.log(`Admin user created: ${adminUsername} (change ADMIN_USERNAME/ADMIN_PASSWORD in env)`);
    } else {
      console.log('Admin user already exists');
    }
  } catch (e) {
    console.error('Error ensuring admin user:', e);
  }
};

testConnection();
ensureAdmin();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
