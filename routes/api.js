const express = require('express');
const router = express.Router();
const plagiarismController = require('../controllers/plagiarismController');
const rewriteController = require('../controllers/rewriteController');
const historyController = require('../controllers/historyController');
const authMiddleware = require('../middleware/auth');

const uploadController = require('../controllers/uploadController');
const chatController = require('../controllers/chatController');
const urlController = require('../controllers/urlController'); // New import
const teamController = require('../controllers/teamController'); // New import
const multer = require('multer');
const upload = multer({
    dest: 'uploads/'
});

const grammarController = require('../controllers/grammarController');
const citationController = require('../controllers/citationController');

// Protected routes - require authentication
router.post('/plagiarism/check', authMiddleware, plagiarismController.checkPlagiarism);
router.post('/plagiarism/bulk', authMiddleware, plagiarismController.bulkCheck);
router.get('/plagiarism/bulk/:batchId', authMiddleware, plagiarismController.getBatchStatus);
router.get('/plagiarism/batches', authMiddleware, plagiarismController.getUserBatches);
router.post('/grammar/check', authMiddleware, grammarController.checkGrammarAndStyle);
router.post('/grammar/apply', authMiddleware, grammarController.applyGrammarFixes);
router.post('/rewrite', authMiddleware, rewriteController.rewriteContent);
router.get('/history', authMiddleware, historyController.getHistory);
router.post('/upload', authMiddleware, upload.single('file'), uploadController.extractText);
router.post('/extract-url', authMiddleware, urlController.extractUrl);
router.post('/chat', authMiddleware, chatController.chat);

// Citation Routes
router.post('/citation/generate', authMiddleware, citationController.createCitation);
router.post('/citation/all-formats', authMiddleware, citationController.getAllFormats);
router.post('/citation/extract-metadata', authMiddleware, citationController.extractMetadata);

// Team Routes
router.get('/team', authMiddleware, teamController.getTeam);
router.post('/team/create', authMiddleware, teamController.createTeam);
router.post('/team/join', authMiddleware, teamController.joinTeam);
router.post('/team/leave', authMiddleware, teamController.leaveTeam);

// Gamification Route
const { getGamificationStats } = require('../services/gamificationService');
router.get('/gamification/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await getGamificationStats(req.user._id);
        res.json(stats);
    } catch (error) {
        console.error('Gamification stats error:', error);
        res.status(500).json({ error: 'Failed to get gamification stats' });
    }
});

module.exports = router;
