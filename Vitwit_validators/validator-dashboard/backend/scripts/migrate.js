const { Sequelize } = require('sequelize');
require('dotenv').config();

const networks = [
  'cosmos', 'polygon', 'avail', 'ika', 'cheqd', 'stride',
  'passage', 'mantra', 'namada', 'osmosis', 'agoric', 'nomic', 'regen', 'akash'
];

const sequelize = new Sequelize(
  process.env.DB_NAME || 'validator_dashboard',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    for (const network of networks) {
      const tableName = `${network}_data`;
      
      const query = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id SERIAL PRIMARY KEY,
          validator_addr VARCHAR(255) NOT NULL,
          self_delegations VARCHAR(255) NOT NULL,
          external_delegations VARCHAR(255) NOT NULL,
          rewards VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_${tableName}_validator ON ${tableName}(validator_addr);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_timestamp ON ${tableName}(timestamp);
      `;

      await sequelize.query(query);
      console.log(`Created/Verified table: ${tableName}`);
    }

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await sequelize.close();
  }
}

createTables();
