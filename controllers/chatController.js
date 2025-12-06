const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.chat = async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Construct a system-like prompt (Gemini Pro doesn't strictly support system messages in the same way as GPT-4, 
        // so we prepend instructions).
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
        console.error('Chat Error:', error);
        res.status(500).json({ error: 'Failed to generate chat response' });
    }
};
