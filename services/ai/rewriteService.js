const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

/**
 * TEXT REWRITE SERVICE
 * 
 * Goal: Produce text that sounds human-written
 */

const REWRITE_PROMPT = `Rewrite the following text so it sounds fully human-written. Add natural variation, personality, slight imperfections, emotional tone, and conversational flow. Make it feel genuine.

IMPORTANT RULES:
1. Use contractions (don't, can't, it's, won't)
2. Add personal touches ("I think", "honestly", "to be fair")
3. Mix sentence lengths - some short, some longer
4. Avoid: Furthermore, Moreover, Additionally, In conclusion
5. Be conversational, not formal

TEXT TO REWRITE:
`;

/**
 * Rewrite with OpenAI GPT-4o  
 */
async function rewriteWithOpenAI(text) {
    if (!openai) throw new Error('OpenAI not configured');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You rewrite text to sound 100% human-written with personality and natural flow.'
            },
            {
                role: 'user',
                content: REWRITE_PROMPT + `"${text}"\n\nHuman-sounding version:`
            }
        ],
        temperature: 1.1,
        max_tokens: 3000,
    });

    return response.choices[0].message.content.trim();
}

/**
 * Rewrite with Gemini - trying multiple model names
 */
async function rewriteWithGemini(text) {
    console.log('🔄 Starting Gemini rewrite...');

    // Try different model names
    const modelNames = [
        'gemini-1.5-pro',
        'gemini-1.0-pro',
        'gemini-pro',
        'models/gemini-pro',
        'models/gemini-1.5-pro'
    ];

    let lastError = null;

    for (const modelName of modelNames) {
        try {
            console.log(`  Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(REWRITE_PROMPT + `"${text.substring(0, 4000)}"\n\nHuman-sounding version:`);
            const rewritten = result.response.text().trim();
            console.log(`✅ Gemini rewrite complete with ${modelName}`);
            return rewritten;
        } catch (error) {
            console.log(`  Model ${modelName} failed: ${error.message.substring(0, 100)}`);
            lastError = error;
        }
    }

    throw lastError || new Error('All Gemini models failed');
}

/**
 * Simple rule-based rewrite as fallback
 */
function simpleRewrite(text) {
    console.log('⚡ Using simple rule-based rewrite as fallback');

    let result = text;

    // Add contractions
    const contractions = [
        [/\bI am\b/gi, "I'm"], [/\bI will\b/gi, "I'll"], [/\bI have\b/gi, "I've"],
        [/\byou are\b/gi, "you're"], [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
        [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bdid not\b/gi, "didn't"],
        [/\bwill not\b/gi, "won't"], [/\bcannot\b/gi, "can't"], [/\bwould not\b/gi, "wouldn't"],
        [/\bthey are\b/gi, "they're"], [/\bwe are\b/gi, "we're"], [/\bthere is\b/gi, "there's"],
    ];

    for (const [pattern, replacement] of contractions) {
        result = result.replace(pattern, replacement);
    }

    // Remove AI patterns
    const aiPatterns = [
        /\bFurthermore,?\s*/gi, /\bMoreover,?\s*/gi, /\bAdditionally,?\s*/gi,
        /\bIn conclusion,?\s*/gi, /\bIt is important to note that\s*/gi,
    ];

    for (const pattern of aiPatterns) {
        result = result.replace(pattern, '');
    }

    // Add some randomness - shuffle sentences slightly
    const sentences = result.split(/\. /).filter(s => s.length > 0);
    if (sentences.length > 3) {
        // Randomly add "So" or "Now" to some sentences
        for (let i = 0; i < sentences.length; i++) {
            const rand = Math.random();
            if (rand < 0.15 && !sentences[i].startsWith('So') && !sentences[i].startsWith('Now')) {
                sentences[i] = 'So, ' + sentences[i].toLowerCase();
            } else if (rand < 0.25) {
                sentences[i] = sentences[i].replace(/^(\w)/, (m) => m.toLowerCase());
                sentences[i] = 'Honestly, ' + sentences[i];
            }
        }
    }

    return sentences.join('. ');
}

/**
 * Post-process to ensure human touches
 */
function addHumanTouches(text) {
    let result = text;

    // Force contractions
    const contractions = [
        [/\bI am\b/gi, "I'm"], [/\bI will\b/gi, "I'll"], [/\bI have\b/gi, "I've"],
        [/\byou are\b/gi, "you're"], [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
        [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bdid not\b/gi, "didn't"],
        [/\bwill not\b/gi, "won't"], [/\bcannot\b/gi, "can't"], [/\bwould not\b/gi, "wouldn't"],
    ];

    for (const [pattern, replacement] of contractions) {
        result = result.replace(pattern, replacement);
    }

    // Remove AI-typical phrases
    const aiPatterns = [
        /\bFurthermore,?\s*/gi, /\bMoreover,?\s*/gi, /\bAdditionally,?\s*/gi,
        /\bIn conclusion,?\s*/gi, /\bIt is important to note that\s*/gi,
    ];

    for (const pattern of aiPatterns) {
        result = result.replace(pattern, '');
    }

    return result;
}

/**
 * Main rewrite function
 */
const rewriteText = async (text) => {
    try {
        let result;

        // Try OpenAI first
        if (openai) {
            try {
                console.log('Rewriting with OpenAI GPT-4o...');
                result = await rewriteWithOpenAI(text);
                result = addHumanTouches(result);
                console.log('Human-like rewrite complete (OpenAI)');
                return result;
            } catch (error) {
                console.warn('OpenAI failed:', error.message.substring(0, 100));
            }
        }

        // Try Gemini
        try {
            result = await rewriteWithGemini(text);
            result = addHumanTouches(result);
            console.log('Human-like rewrite complete (Gemini)');
            return result;
        } catch (error) {
            console.warn('Gemini failed:', error.message.substring(0, 100));
        }

        // Fallback to simple rule-based rewrite
        result = simpleRewrite(text);
        console.log('Human-like rewrite complete (Simple fallback)');
        return result;

    } catch (error) {
        console.error('Rewrite error:', error.message);
        // Return the original with basic modifications as last resort
        return simpleRewrite(text);
    }
};

module.exports = { rewriteText };
