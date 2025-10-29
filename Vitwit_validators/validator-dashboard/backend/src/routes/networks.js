const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');

router.get('/', networkController.getNetworks);
router.get('/:network', networkController.getNetworkData);
router.get('/:network/history', networkController.getNetworkDataHistory);
router.get('/:network/latest', networkController.getNetworkLatestData);
router.get('/all/latest', networkController.getAllNetworksData);

module.exports = router;
