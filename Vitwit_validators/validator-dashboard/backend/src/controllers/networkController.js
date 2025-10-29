const { QueryTypes } = require('sequelize');
const db = require('../config/database');
const moment = require('moment');

const networks = [
  'cosmos', 'polygon', 'avail', 'cheqd',
  'passage', 'mantra', 'namada', 'osmosis', 'agoric', 'nomic', 'regen', 'akash'
];

const ALL_NETWORKS = 'all';

const getTimeRange = (range) => {
  const now = moment();
  switch (range) {
    case '1d': return now.subtract(1, 'days').toDate();
    case '7d': return now.subtract(7, 'days').toDate();
    case '1m': return now.subtract(1, 'months').toDate();
    case '3m': return now.subtract(3, 'months').toDate();
    case '6m': return now.subtract(6, 'months').toDate();
    default: return now.subtract(7, 'days').toDate();
  }
};

exports.getNetworks = (req, res) => {
  res.json([ALL_NETWORKS, ...networks]);
};

exports.getNetworkData = async (req, res) => {
  const { network } = req.params;
  if (network === ALL_NETWORKS) {
    try {
      const [latest] = await db.query('SELECT * FROM total_rewards ORDER BY timestamp DESC LIMIT 1', { type: QueryTypes.SELECT });
      // Format the response to match the expected structure
      const formattedData = {
        self_delegations: latest?.total_self_delegations_usd ? `${latest.total_self_delegations_usd} USD` : '0',
        external_delegations: latest?.total_external_delegations_usd ? `${latest.total_external_delegations_usd} USD` : '0',
        rewards: latest?.total_rewards_usd ? `${latest.total_rewards_usd} USD` : '0',
        timestamp: latest?.timestamp || new Date().toISOString()
      };
      return res.json(formattedData);
    } catch (e) {
      console.error('Error in getNetworkData for all networks:', e);
      return res.status(500).json({ error: 'DB error', details: e.message });
    }
  }
  
  if (!networks.includes(network)) return res.status(404).json({ error: 'Network not found' });
  const tableName = `${network}_data`;
  try {
    const [latest] = await db.query(`SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 1`, { type: QueryTypes.SELECT });
    res.json(latest || {});
  } catch (e) {
    res.status(500).json({ error: 'DB error', details: e.message });
  }
};

exports.getNetworkDataHistory = async (req, res) => {
  const { network } = req.params;
  const { range = '7d' } = req.query;
  const since = getTimeRange(range);
  
  if (network === ALL_NETWORKS) {
    try {
      const data = await db.query(
        'SELECT * FROM total_rewards WHERE timestamp >= :since ORDER BY timestamp ASC',
        { replacements: { since }, type: QueryTypes.SELECT }
      );
      // Format the historical data to match the expected structure
      const formattedData = data.map(item => ({
        self_delegations: item.total_self_delegations_usd ? `${item.total_self_delegations_usd} USD` : '0',
        external_delegations: item.total_external_delegations_usd ? `${item.total_external_delegations_usd} USD` : '0',
        rewards: item.total_rewards_usd ? `${item.total_rewards_usd} USD` : '0',
        timestamp: item.timestamp
      }));
      return res.json(formattedData);
    } catch (e) {
      console.error('Error in getNetworkDataHistory for all networks:', e);
      return res.status(500).json({ error: 'DB error', details: e.message });
    }
  }
  
  if (!networks.includes(network)) return res.status(404).json({ error: 'Network not found' });
  
  const tableName = `${network}_data`;
  try {
    const data = await db.query(
      `SELECT * FROM ${tableName} WHERE timestamp >= :since ORDER BY timestamp ASC`,
      { replacements: { since }, type: QueryTypes.SELECT }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'DB error', details: e.message });
  }
};

exports.getAllNetworksData = async (req, res) => {
  const results = {};
  for (const network of networks) {
    const tableName = `${network}_data`;
    try {
      const [latest] = await db.query(`SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT 1`, { type: QueryTypes.SELECT });
      results[network] = latest || null;
    } catch (e) {
      results[network] = null;
    }
  }
  res.json(results);
};

// Returns the latest row for each validator_addr in the selected network's table
exports.getNetworkLatestData = async (req, res) => {
  const { network } = req.params;
  
  if (network === ALL_NETWORKS) {
    try {
      const [latest] = await db.query(
        'SELECT * FROM total_rewards ORDER BY timestamp DESC LIMIT 1',
        { type: QueryTypes.SELECT }
      );
      // Format the response to match the expected structure
      const formattedData = {
        self_delegations: latest.total_self_delegations_usd ? `${latest.total_self_delegations_usd} USD` : '0',
        external_delegations: latest.total_external_delegations_usd ? `${latest.total_external_delegations_usd} USD` : '0',
        rewards: latest.total_rewards_usd ? `${latest.total_rewards_usd} USD` : '0',
        timestamp: latest.timestamp
      };
      return res.json([formattedData]);
    } catch (e) {
      return res.status(500).json({ error: 'DB error', details: e.message });
    }
  }
  
  if (!networks.includes(network)) return res.status(404).json({ error: 'Network not found' });
  
  const tableName = `${network}_data`;
  try {
    const data = await db.query(
      `SELECT DISTINCT ON (validator_addr) * FROM ${tableName} ORDER BY validator_addr, timestamp DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'DB error', details: e.message });
  }
};
