const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, deleteUser, updateUserRole } = require('../controllers/adminController');

// All routes here are protected by auth + adminAuth in app.js
router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

module.exports = router;
