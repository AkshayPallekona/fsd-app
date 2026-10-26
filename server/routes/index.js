const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const propertyRoutes = require('./property.routes');
const favoriteRoutes = require('./favorite.routes');
const inquiryRoutes = require('./inquiry.routes');
const reportRoutes = require('./report.routes');
const adminRoutes = require('./admin.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

// Mount auth routes: /api/v1/auth/*
router.use('/auth', authRoutes);

// Mount user routes: /api/v1/users/*
router.use('/users', userRoutes);

// Mount favorite routes: /api/v1/properties/:id/favorite
router.use('/properties', favoriteRoutes);

// Mount property inquiries & reports sub-routes: /api/v1/properties/:id/inquiries, /reports
router.use('/properties', inquiryRoutes);
router.use('/properties', reportRoutes);

// Mount property core routes: /api/v1/properties/*
router.use('/properties', propertyRoutes);

// Mount owner inquiries and reports routes: /api/v1/owner/*
router.use(inquiryRoutes);
router.use(reportRoutes);

// Mount admin routes: /api/v1/admin/*
router.use('/admin', adminRoutes);

// Mount health route: /api/v1/health
router.use('/health', healthRoutes);

module.exports = router;
