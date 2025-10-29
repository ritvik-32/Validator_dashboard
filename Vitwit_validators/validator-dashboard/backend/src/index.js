require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/database');
const networkRoutes = require('./routes/networks');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/networks', networkRoutes);

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

testConnection();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
