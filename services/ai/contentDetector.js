const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AI Content Detector - Provides REAL AI detection scores
 * 
 * This detector analyzes text to determine if it was written by AI.
 * Returns a score from 0-100 indicating likelihood of AI authorship.
 */

const detectAI = async (text) => {
    console.log('🔍 Starting AI detection...');

    try {
        // Use gemini-pro which is the stable, available model
        const model = genAI.getGenerativeModel({
            model: 'gemini-pro',
        });

        const prompt = `You are an AI content detector. Analyze the following text to determine if it was written by AI (like ChatGPT, Claude, Gemini) or by a human.

SCORING GUIDELINES:
- 0-20%: Clearly human-written (personal voice, imperfections, unique style)
- 20-40%: Probably human (some AI-like patterns but mostly human)
- 40-60%: Mixed/Uncertain (could be either)
- 60-80%: Probably AI (formal, structured, AI patterns)
- 80-100%: Clearly AI-written (perfect grammar, generic explanations, no personality)

AI INDICATORS (increase score):
- Perfect grammar and punctuation
- Repetitive sentence structures
- Generic, encyclopedic explanations
- Overuse of transition words (Furthermore, Moreover, Additionally)
- Lack of personal opinions or emotions

HUMAN INDICATORS (decrease score):
- Contractions (don't, can't, won't)
- Personal opinions and experiences
- Conversational tone
- Minor grammatical imperfections

Text to analyze:
"${text.substring(0, 3000)}"

Respond with ONLY valid JSON in this exact format:
{"score": <number 0-100>, "reason": "<brief explanation>", "language": "<detected language>"}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        console.log('📝 AI Detection raw response:', response.substring(0, 200));

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ AI Detection score:', parsed.score);
            return {
                score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
                reason: parsed.reason || "Analysis complete",
                language: parsed.language || "English"
            };
        }

        throw new Error('Invalid response format');

    } catch (error) {
        console.error('❌ AI Detection error:', error.message);
        console.error('   Full error:', error);

        // Return a mock score based on simple heuristics as fallback
        const hasAiPatterns = text.includes('Furthermore') || text.includes('Moreover') ||
            text.includes('In conclusion') || text.includes('Additionally');
        const hasCasualTone = text.includes("don't") || text.includes("can't") ||
            text.includes("I think") || text.includes("honestly");

        const fallbackScore = hasAiPatterns ? 65 : (hasCasualTone ? 15 : 35);

        return {
            score: fallbackScore,
            reason: "Basic analysis (API unavailable)",
            language: "English"
        };
    }
};

module.exports = { detectAI };
