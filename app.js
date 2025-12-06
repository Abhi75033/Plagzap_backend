const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const adminRoutes = require('./routes/admin'); // New import
const webhookRoutes = require('./routes/webhook'); // New import
const auth = require('./middleware/auth'); // New import for authentication middleware
const adminAuth = require('./middleware/adminAuth'); // New import for admin authorization middleware

const app = express();

// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to PlagZap API - Server is running!');
});

// Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Simple ping endpoint (alternative)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});


// Middleware
app.use(cors()); // Allow all origins for extension support
app.use(express.json({ limit: '50mb' })); // Increased limit for large text
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', apiRoutes);
app.use('/api/admin', auth, adminAuth, adminRoutes); // Protect all admin routes
app.use('/api/webhooks', webhookRoutes);

module.exports = app;
