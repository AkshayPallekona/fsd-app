const express = require('express');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

router.get('/', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  const data = {
    status: isDbConnected ? 'healthy' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };

  if (!isDbConnected) {
    return ApiResponse.error(res, 'SERVICE_UNAVAILABLE', 'Database not connected.', 503, data);
  }

  return ApiResponse.success(res, data, 'Server is running smoothly.', 200);
});

module.exports = router;
