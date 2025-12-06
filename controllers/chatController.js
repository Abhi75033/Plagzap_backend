const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI only if API key is available
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Chat: Gemini AI initialized');
} else {
    console.warn('⚠️ Chat: GEMINI_API_KEY not found. Chat feature disabled.');
}

exports.chat = async (req, res) => {
    try {
        // Check if Gemini is initialized
        if (!genAI) {
            console.error('❌ Chat failed: GEMINI_API_KEY not configured');
            return res.status(503).json({
                error: 'AI assistant is not configured. Please contact support.',
                reply: 'Sorry, the AI assistant is currently unavailable. Please try again later.'
            });
        }

        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use gemini-2.5-flash (available for this API key)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Construct a system-like prompt
        const systemInstruction = `
            You are PlagZap Assistant, a helpful and friendly AI assistant for a plagiarism detection and rewriting tool called PlagZap.
            Your goal is to help users with:
            1. Understanding their plagiarism score.
            2. Providing tips on how to rewrite content to make it unique.
            3. Explaining how to use the PlagZap features (Plagiarism Check, Rewrite, History, API).
            4. General writing advice (grammar, style, tone).

            Be concise, professional, and encouraging. If you don't know something about the specific user data (because you don't have access to their full database), say so politely.
            
            User Context (if any): ${JSON.stringify(context || {})}
        `;

        const fullPrompt = `${systemInstruction}\n\nUser: ${message}\nAssistant:`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error('Chat Error:', error.message);
        console.error('Chat Error Details:', error);

        // Check for specific error types
        if (error.message?.includes('API key')) {
            return res.status(503).json({
                error: 'AI service authentication failed',
                reply: 'Sorry, I\'m having trouble connecting to my AI service. Please try again later.'
            });
        }

        if (error.message?.includes('model')) {
            return res.status(503).json({
                error: 'AI model unavailable',
                reply: 'Sorry, the AI model is temporarily unavailable. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Failed to generate chat response',
            reply: 'Sorry, I encountered an error. Please try again.'
        });
    }
};
