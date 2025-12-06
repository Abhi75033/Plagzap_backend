const History = require('../models/History');
const { splitTextIntoChunks } = require('../services/textService');
const { generateEmbedding } = require('../services/ai/embeddingService');
const { detectAI } = require('../services/ai/contentDetector');
const webhookService = require('../services/webhookService');
const { processAnalysis } = require('../services/gamificationService');
const axios = require('axios');

// Common stop words to filter out for better comparison
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'its',
    'this', 'that', 'these', 'those', 'am', 'also', 'so', 'than', 'too',
    'very', 'just', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'both', 'because', 'until', 'while', 'which', 'who',
    'whom', 'what', 'if', 'we', 'they', 'you', 'he', 'she', 'i', 'me',
    'my', 'your', 'his', 'her', 'our', 'their', 'any', 'up', 'out'
]);

// Preprocess text: lowercase, remove punctuation, filter stop words
const preprocessText = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

// Calculate Jaccard Similarity (better for text comparison than Levenshtein)
const calculateJaccardSimilarity = (text1, text2) => {
    const words1 = new Set(preprocessText(text1));
    const words2 = new Set(preprocessText(text2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
};

// Calculate N-gram similarity for better phrase matching
const getNGrams = (words, n) => {
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
};

const calculateNGramSimilarity = (text1, text2, n = 3) => {
    const words1 = preprocessText(text1);
    const words2 = preprocessText(text2);

    if (words1.length < n || words2.length < n) {
        return calculateJaccardSimilarity(text1, text2);
    }

    const ngrams1 = new Set(getNGrams(words1, n));
    const ngrams2 = new Set(getNGrams(words2, n));

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    return intersection.size / Math.min(ngrams1.size, ngrams2.size);
};

// Combined similarity score using multiple methods
const calculateTextSimilarity = (text1, text2) => {
    const jaccardScore = calculateJaccardSimilarity(text1, text2);
    const ngramScore = calculateNGramSimilarity(text1, text2, 3);

    // Weight: 40% Jaccard (word overlap), 60% N-gram (phrase matching)
    // N-gram is more important for plagiarism as it catches copied phrases
    return (jaccardScore * 0.4) + (ngramScore * 0.6);
};

// Check if the matched content is substantial enough
const isSubstantialMatch = (chunk, snippet) => {
    const chunkWords = preprocessText(chunk);
    const snippetWords = preprocessText(snippet);

    // Need at least 3 meaningful words in common (lowered for better detection)
    const commonWords = chunkWords.filter(w => snippetWords.includes(w));
    return commonWords.length >= 3;
};

// Perform Google Search
const googleSearch = async (query) => {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
        console.warn('Google Search Keys missing. Skipping search.');
        return [];
    }

    try {
        // Clean the query - use only first 100 chars to get better results
        const cleanQuery = query.substring(0, 150).replace(/[^\w\s]/g, ' ').trim();

        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: apiKey,
                cx: cx,
                q: `"${cleanQuery}"`, // Use quotes for exact phrase matching
                num: 5 // Fetch top 5 results for better coverage
            }
        });
        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching Google Search results:', error.message);
        return [];
    }
};

exports.checkPlagiarism = async (req, res) => {
    try {
        const { text } = req.body;
        const user = req.user;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Check Permissions
        const analysisStatus = user.canPerformAnalysis();
        if (!analysisStatus.allowed) {
            return res.status(403).json({
                error: 'Limit reached',
                reason: analysisStatus.reason,
                limit: analysisStatus.limit,
            });
        }

        console.log('Analyzing text for user:', user._id, 'Length:', text.length);

        // 1. Split text into chunks
        const chunks = splitTextIntoChunks(text, 300); // 50-60 words
        const highlights = [];
        let sourcesFound = new Map(); // Track unique sources

        // 2. Select representative chunks to query (save API quota)
        // We query every 2nd chunk to balance coverage vs speed/cost
        const chunksToQuery = chunks.filter((_, index) => index % 2 === 0);

        console.log('Querying Google for', chunksToQuery.length, 'chunks...');

        // 3. Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            let maxSimilarity = 0;
            let bestSource = null;

            // Only query for selected chunks (every 2nd chunk)
            if (i % 2 === 0) {
                const searchResults = await googleSearch(chunk);

                for (const result of searchResults) {
                    // Check snippet similarity
                    const snippet = result.snippet || "";

                    // Skip if snippet is too short for meaningful comparison
                    if (snippet.length < 30) continue;

                    // Calculate similarity using improved algorithm
                    const similarity = calculateTextSimilarity(chunk, snippet);

                    // Also check if the match is substantial (enough common words)
                    const substantial = isSubstantialMatch(chunk, snippet);

                    if (similarity > maxSimilarity && substantial) {
                        maxSimilarity = similarity;
                        bestSource = {
                            title: result.title,
                            url: result.link,
                            snippet: snippet
                        };
                    }
                }

                // Artificial delay to avoid hitting Google Rate Limits too hard
                await new Promise(r => setTimeout(r, 200));
            }

            // Threshold for "Plagiarism" - LOWERED to 0.30 for better detection
            // 30% similarity indicates potential plagiarism (matches external tools)
            if (maxSimilarity > 0.30) {
                highlights.push({
                    text: chunk,
                    type: 'plagiarized',
                    source: bestSource?.title || 'Unknown Source',
                    url: bestSource?.url || '#',
                    score: Math.round(maxSimilarity * 100)
                });

                if (bestSource) {
                    sourcesFound.set(bestSource.url, bestSource);
                }
            } else {
                highlights.push({
                    text: chunk,
                    type: 'safe',
                    score: Math.round(maxSimilarity * 100) // Show similarity even for safe chunks
                });
            }
        }

        // Calculate overall plagiarism score
        // Only count 'plagiarized' chunks towards the score
        const plagiarizedCount = highlights.filter(h => h.type === 'plagiarized').length;
        const plagiarismScore = chunks.length > 0 ?
            Math.round((plagiarizedCount / chunks.length) * 100) : 0;

        // Update User Usage
        await user.incrementUsage();

        // Process gamification (streaks & badges)
        let gamificationResult = { streak: null, newBadges: [] };
        try {
            gamificationResult = await processAnalysis(user._id);
        } catch (e) {
            console.error('Gamification error:', e.message);
        }

        // Get updated status for response
        const updatedStatus = user.canPerformAnalysis();

        // Perform AI Detection (REAL SCORES) - Do this BEFORE saving history
        let aiDetection = { score: 0, reason: "Analysis unavailable", language: 'English' };
        try {
            aiDetection = await detectAI(text);
        } catch (e) {
            console.error("AI Detection failed:", e.message);
        }

        // Ensure score is a number
        const safeAiScore = (aiDetection && typeof aiDetection.score === 'number') ? aiDetection.score : 0;
        const safeAiReason = (aiDetection && aiDetection.reason) ? aiDetection.reason : "Analysis unavailable";
        const finalLanguage = aiDetection?.language || 'English';

        // Combined Risk Score: 50% Plagiarism + 50% AI
        const riskScore = Math.round((plagiarismScore * 0.5) + (safeAiScore * 0.5));

        // Save to History with the COMBINED riskScore (not just plagiarismScore)
        const historyEntry = new History({
            userId: user._id,
            originalText: text,
            highlights,
            overallScore: riskScore,
        });

        await historyEntry.save();

        // Dispatch Webhook (Fire and Forget)
        const webhookPayload = {
            id: historyEntry._id,
            textSnippet: text.substring(0, 100) + '...',
            score: riskScore,
            aiScore: safeAiScore,
            plagiarismScore: plagiarismScore,
            language: finalLanguage,
            highlightsCount: highlights.length,
            completedAt: new Date().toISOString()
        };

        webhookService.dispatch(req.user._id, 'analysis.completed', webhookPayload).catch(err => {
            console.error('Webhook dispatch failed:', err.message);
        });

        res.json({
            overallScore: riskScore, // Combined risk score
            plagarismScore: plagiarismScore, // REAL plagiarism score
            aiScore: safeAiScore, // REAL AI detection score
            aiReason: safeAiReason, // REAL AI detection reason
            language: finalLanguage,
            highlights,
            matches: Array.from(sourcesFound.values()),
            id: historyEntry._id,
            usage: {
                remaining: updatedStatus.remaining,
                limit: updatedStatus.limit,
                isDaily: updatedStatus.isDaily,
                dailyUsageCount: user.dailyUsageCount,
                totalUsageCount: user.usageCount,
            },
            gamification: {
                currentStreak: gamificationResult.streak?.currentStreak || 0,
                longestStreak: gamificationResult.streak?.longestStreak || 0,
                totalAnalyses: gamificationResult.streak?.totalAnalyses || 0,
                newBadges: gamificationResult.newBadges || [],
            },
        });

    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Import batch service for bulk operations
const batchService = require('../services/batchService');

/**
 * Bulk plagiarism check for multiple texts
 */
exports.bulkCheck = async (req, res) => {
    try {
        const { texts, filenames } = req.body;

        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ error: 'Texts array is required' });
        }

        if (texts.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 texts per batch' });
        }

        // Check user limits
        const user = req.user;
        const usageCheck = user.canPerformAnalysis();

        if (!usageCheck.allowed) {
            return res.status(403).json({
                error: usageCheck.reason === 'FREE_LIMIT_REACHED'
                    ? 'Free tier limit reached. Please upgrade to continue.'
                    : usageCheck.reason === 'DAILY_LIMIT_REACHED'
                        ? 'Daily limit reached. Try again tomorrow.'
                        : 'Subscription expired. Please renew.',
                code: usageCheck.reason,
            });
        }

        // Create batch
        const batch = batchService.createBatch(user._id, texts, { filenames });

        // Start processing in background
        setImmediate(async () => {
            batchService.startBatchProcessing(batch.id);

            for (let i = 0; i < batch.items.length; i++) {
                const item = batch.items[i];

                try {
                    // Simple plagiarism check (without full API call overhead)
                    const chunks = splitTextIntoChunks(item.text, 300);
                    let plagiarizedCount = 0;

                    for (const chunk of chunks) {
                        const searchResults = await googleSearch(chunk);
                        if (searchResults && searchResults.length > 0) {
                            const maxSimilarity = searchResults.reduce((max, result) => {
                                const snippet = result.snippet || '';
                                const sim = calculateJaccardSimilarity(chunk, snippet);
                                return Math.max(max, sim);
                            }, 0);

                            if (maxSimilarity > 0.30) {
                                plagiarizedCount++;
                            }
                        }
                    }

                    const plagiarismScore = chunks.length > 0
                        ? Math.round((plagiarizedCount / chunks.length) * 100)
                        : 0;

                    // AI Detection
                    let aiScore = 0;
                    try {
                        const aiResult = await detectAI(item.text);
                        aiScore = aiResult.score || 0;
                    } catch (e) {
                        console.error('AI detection failed for batch item:', e.message);
                    }

                    batchService.updateBatchItem(batch.id, i, {
                        plagarismScore: plagiarismScore,
                        aiScore: aiScore,
                        overallScore: Math.round((plagiarismScore * 0.5) + (aiScore * 0.5)),
                    });

                } catch (error) {
                    console.error(`Batch item ${i} failed:`, error.message);
                    batchService.updateBatchItem(batch.id, i, null, error.message);
                }

                // Add delay between items to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        });

        res.json({
            batchId: batch.id,
            status: 'processing',
            totalItems: batch.totalItems,
            message: 'Batch processing started. Poll /plagiarism/bulk/:batchId for progress.',
        });

    } catch (error) {
        console.error('Bulk check error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Get batch status and results
 */
exports.getBatchStatus = async (req, res) => {
    try {
        const { batchId } = req.params;

        const batch = batchService.getBatch(batchId);

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        // Verify ownership
        if (batch.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            id: batch.id,
            status: batch.status,
            progress: Math.round((batch.processedItems / batch.totalItems) * 100),
            processedItems: batch.processedItems,
            totalItems: batch.totalItems,
            items: batch.items.map(item => ({
                id: item.id,
                filename: item.filename,
                status: item.status,
                result: item.result,
                error: item.error,
            })),
            summary: batch.summary,
            createdAt: batch.createdAt,
            completedAt: batch.completedAt,
        });

    } catch (error) {
        console.error('Get batch status error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Get user's batch history
 */
exports.getUserBatches = async (req, res) => {
    try {
        const batches = batchService.getUserBatches(req.user._id);
        res.json(batches);
    } catch (error) {
        console.error('Get user batches error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
