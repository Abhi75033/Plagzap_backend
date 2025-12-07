const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

/**
 * ADVANCED TEXT HUMANIZATION SERVICE
 * 
 * Goal: Transform text to be UNDETECTABLE by AI detection tools
 * Target: <10% AI detection score, 0% plagiarism
 */

// Ultra-detailed prompt for bypassing AI detection
const HUMANIZATION_PROMPT = `You are an expert human writer. Your task is to completely rewrite the given text so it appears 100% HUMAN-WRITTEN and passes ALL AI detection tools.

CRITICAL REQUIREMENTS TO BYPASS AI DETECTION:

1. SENTENCE STRUCTURE - VARY WILDLY:
   - Mix very short sentences (3-5 words) with longer ones
   - Start some sentences with "And", "But", "So", "Because" 
   - Use fragments occasionally. Like this one.
   - Vary paragraph lengths unpredictably

2. VOCABULARY - USE CASUAL HUMAN WORDS:
   - Replace formal words: "utilize" → "use", "consequently" → "so", "demonstrate" → "show"
   - Add filler words naturally: "basically", "kind of", "actually", "pretty much"
   - Use contractions ALWAYS: "don't", "can't", "won't", "it's", "that's", "I've"

3. PERSONAL VOICE - ADD HUMAN PERSONALITY:
   - Insert opinions: "I think", "honestly", "to be fair", "in my experience"
   - Add emotional reactions: "which is crazy", "that's frustrating", "pretty cool actually"
   - Show uncertainty: "I'm not 100% sure but", "I could be wrong", "as far as I know"

4. IMPERFECTIONS - HUMANS AREN'T PERFECT:
   - Use informal grammar occasionally (starting with "And" or "But")
   - Add conversational asides in dashes or parentheses
   - Use ellipsis... for trailing thoughts

5. ABSOLUTELY AVOID THESE AI PATTERNS:
   - NEVER use: Furthermore, Moreover, Additionally, In conclusion, It is important to note
   - NEVER use: One might argue, It should be noted, This demonstrates, This illustrates
   - NEVER use: shall, hence, thus, therefore (at sentence start), aforementioned
   - NEVER start multiple consecutive sentences the same way
   - NEVER use overly balanced "on one hand... on the other hand" structures

6. RESTRUCTURE COMPLETELY:
   - Don't just swap words - rebuild sentences from scratch
   - Change the order of ideas within paragraphs
   - Break long sentences into 2-3 shorter ones
   - Combine short choppy sentences sometimes

7. ADD NATURAL TRANSITIONS:
   - "The thing is...", "Here's the deal:", "What's interesting is..."
   - "Look,", "Okay so", "Basically,", "Anyway,"

REWRITE THIS TEXT (keep the same meaning, completely different words and structure):
`;

/**
 * Post-processing: Aggressive humanization patterns
 */
function aggressiveHumanize(text) {
    let result = text;

    // 1. Force ALL contractions
    const contractionRules = [
        [/\bI am\b/gi, "I'm"], [/\bI will\b/gi, "I'll"], [/\bI have\b/gi, "I've"], [/\bI would\b/gi, "I'd"],
        [/\byou are\b/gi, "you're"], [/\byou have\b/gi, "you've"], [/\byou will\b/gi, "you'll"],
        [/\bhe is\b/gi, "he's"], [/\bshe is\b/gi, "she's"], [/\bhe will\b/gi, "he'll"],
        [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"], [/\bwhat is\b/gi, "what's"],
        [/\bthere is\b/gi, "there's"], [/\bhere is\b/gi, "here's"],
        [/\bwho is\b/gi, "who's"], [/\bwho are\b/gi, "who're"],
        [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bdid not\b/gi, "didn't"],
        [/\bwill not\b/gi, "won't"], [/\bwould not\b/gi, "wouldn't"], [/\bcould not\b/gi, "couldn't"],
        [/\bshould not\b/gi, "shouldn't"], [/\bcannot\b/gi, "can't"], [/\bcan not\b/gi, "can't"],
        [/\bthey are\b/gi, "they're"], [/\bthey have\b/gi, "they've"], [/\bthey will\b/gi, "they'll"],
        [/\bwe are\b/gi, "we're"], [/\bwe have\b/gi, "we've"], [/\bwe will\b/gi, "we'll"],
        [/\blet us\b/gi, "let's"], [/\bis not\b/gi, "isn't"], [/\bare not\b/gi, "aren't"],
        [/\bwas not\b/gi, "wasn't"], [/\bwere not\b/gi, "weren't"],
        [/\bhas not\b/gi, "hasn't"], [/\bhave not\b/gi, "haven't"], [/\bhad not\b/gi, "hadn't"],
    ];

    for (const [pattern, replacement] of contractionRules) {
        result = result.replace(pattern, replacement);
    }

    // 2. Remove ALL AI-typical phrases (comprehensive list)
    const aiPhrases = [
        /\bFurthermore,?\s*/gi, /\bMoreover,?\s*/gi, /\bAdditionally,?\s*/gi,
        /\bIn conclusion,?\s*/gi, /\bTo conclude,?\s*/gi, /\bIn summary,?\s*/gi,
        /\bIt is important to note that\s*/gi, /\bIt is worth noting that\s*/gi,
        /\bIt should be noted that\s*/gi, /\bIt is worth mentioning that\s*/gi,
        /\bOne might argue that\s*/gi, /\bIt can be argued that\s*/gi,
        /\bThis demonstrates that\s*/gi, /\bThis illustrates that\s*/gi,
        /\bConsequently,?\s*/gi, /\bTherefore,?\s*/gi, /\bThus,?\s*/gi,
        /\bHence,?\s*/gi, /\bAccordingly,?\s*/gi, /\bAs a result,?\s*/gi,
        /\bIn light of this,?\s*/gi, /\bWith this in mind,?\s*/gi,
        /\bIt goes without saying that\s*/gi, /\bNeedless to say,?\s*/gi,
        /\bTo put it simply,?\s*/gi, /\bIn other words,?\s*/gi,
        /\bThat being said,?\s*/gi, /\bHaving said that,?\s*/gi,
        /\bIn the context of\s*/gi, /\bWith respect to\s*/gi,
        /\bFrom my perspective,?\s*/gi, /\bIn my opinion,?\s*/gi, // Too formal versions
        /\bFirstly,?\s*/gi, /\bSecondly,?\s*/gi, /\bThirdly,?\s*/gi, /\bLastly,?\s*/gi,
        /\bIn essence,?\s*/gi, /\bFundamentally,?\s*/gi, /\bEssentially,?\s*/gi,
    ];

    for (const pattern of aiPhrases) {
        result = result.replace(pattern, '');
    }

    // 3. Replace formal vocabulary with casual alternatives
    const vocabularySwaps = [
        [/\butilize\b/gi, 'use'], [/\butilization\b/gi, 'use'],
        [/\bdemonstrate\b/gi, 'show'], [/\bdemonstrates\b/gi, 'shows'],
        [/\bindicate\b/gi, 'show'], [/\bindicates\b/gi, 'shows'],
        [/\bfacilitate\b/gi, 'help'], [/\bfacilitates\b/gi, 'helps'],
        [/\bimplement\b/gi, 'do'], [/\bimplements\b/gi, 'does'],
        [/\bcommence\b/gi, 'start'], [/\bcommences\b/gi, 'starts'],
        [/\bterminate\b/gi, 'end'], [/\bterminates\b/gi, 'ends'],
        [/\bpurchase\b/gi, 'buy'], [/\bpurchases\b/gi, 'buys'],
        [/\brequire\b/gi, 'need'], [/\brequires\b/gi, 'needs'],
        [/\bassist\b/gi, 'help'], [/\bassists\b/gi, 'helps'],
        [/\bobtain\b/gi, 'get'], [/\bobtains\b/gi, 'gets'],
        [/\bprovide\b/gi, 'give'], [/\bprovides\b/gi, 'gives'],
        [/\bsufficient\b/gi, 'enough'],
        [/\bnumerous\b/gi, 'many'], [/\bmultiple\b/gi, 'several'],
        [/\bsubstantial\b/gi, 'big'], [/\bsignificant\b/gi, 'major'],
        [/\bcomprehensive\b/gi, 'complete'],
        [/\bnevertheless\b/gi, 'but still'], [/\bnonetheless\b/gi, 'but still'],
        [/\bconsequently\b/gi, 'so'], [/\btherefore\b/gi, 'so'],
        [/\bhowever\b/gi, 'but'], [/\balthough\b/gi, 'even though'],
        [/\bprior to\b/gi, 'before'], [/\bsubsequent to\b/gi, 'after'],
        [/\bin order to\b/gi, 'to'], [/\bdue to the fact that\b/gi, 'because'],
        [/\bfor the purpose of\b/gi, 'to'], [/\bwith regard to\b/gi, 'about'],
        [/\bas a matter of fact\b/gi, 'actually'],
        [/\bat this point in time\b/gi, 'now'], [/\bat the present time\b/gi, 'now'],
        [/\bin the event that\b/gi, 'if'], [/\bin spite of\b/gi, 'despite'],
    ];

    for (const [pattern, replacement] of vocabularySwaps) {
        result = result.replace(pattern, replacement);
    }

    // 4. Add natural sentence starters randomly (15% of sentences)
    const sentences = result.split(/(?<=[.!?])\s+/);
    const naturalStarters = [
        'Honestly, ', 'Look, ', 'So basically, ', 'The thing is, ',
        'I mean, ', 'Actually, ', 'Here\'s the deal - ', 'Okay so ',
        'To be fair, ', 'In my experience, '
    ];

    const processedSentences = sentences.map((sentence, index) => {
        // Skip first sentence and apply randomly to ~15% of sentences
        if (index === 0 || Math.random() > 0.15) return sentence;

        // Don't add if sentence already starts casually
        if (/^(So|But|And|Look|Honestly|Actually|I mean|Okay)/i.test(sentence)) return sentence;

        const starter = naturalStarters[Math.floor(Math.random() * naturalStarters.length)];
        // Lowercase the first letter of original sentence
        return starter + sentence.charAt(0).toLowerCase() + sentence.slice(1);
    });

    result = processedSentences.join(' ');

    // 5. Add occasional casual parenthetical asides (10% of sentences)
    const asides = [
        ' (which is pretty interesting)',
        ' (not gonna lie)',
        ' - and this is key -',
        ' (at least in my experience)',
        ' (crazy, right?)',
        ' - which makes sense when you think about it -',
    ];

    // Apply to some sentences that end with a period
    result = result.replace(/(\w)\.(?=\s|$)/g, (match, char) => {
        if (Math.random() < 0.08) { // 8% chance
            const aside = asides[Math.floor(Math.random() * asides.length)];
            return char + aside + '.';
        }
        return match;
    });

    // 6. Clean up any double spaces or awkward punctuation
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s+([.,!?])/g, '$1');
    result = result.replace(/([.,!?])([A-Z])/g, '$1 $2');

    return result.trim();
}

/**
 * Rewrite with Gemini using enhanced prompting
 */
async function rewriteWithGemini(text) {
    console.log('🔄 Starting Gemini humanization...');

    const modelNames = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro'
    ];

    for (const modelName of modelNames) {
        try {
            console.log(`  Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 1.2, // Higher creativity
                    topP: 0.95,
                    topK: 40,
                }
            });

            const prompt = HUMANIZATION_PROMPT + `"${text.substring(0, 5000)}"

REWRITTEN VERSION (casual, human, undetectable):`;

            const result = await model.generateContent(prompt);
            const rewritten = result.response.text().trim();

            // Remove any quotes that might wrap the response
            const cleaned = rewritten.replace(/^["']|["']$/g, '').trim();

            console.log(`✅ Gemini humanization complete with ${modelName}`);
            return cleaned;
        } catch (error) {
            console.log(`  Model ${modelName} failed: ${error.message.substring(0, 80)}`);
        }
    }

    throw new Error('All Gemini models failed');
}

/**
 * Rewrite with OpenAI GPT-4o
 */
async function rewriteWithOpenAI(text) {
    if (!openai) throw new Error('OpenAI not configured');

    console.log('🔄 Starting OpenAI humanization...');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are a casual human writer who makes text sound completely natural and undetectable by AI detection tools. 

Your writing style:
- Uses contractions everywhere (don't, can't, it's)
- Varies sentence length wildly
- Includes personal opinions and casual language
- Has minor grammatical "imperfections" that humans make
- Never uses formal transition words like "Furthermore" or "Moreover"
- Sounds like a blog post or casual essay, not an academic paper`
            },
            {
                role: 'user',
                content: HUMANIZATION_PROMPT + `"${text}"

Write a completely humanized version that will score <10% on AI detection:`
            }
        ],
        temperature: 1.3, // Higher for more creativity
        max_tokens: 4000,
    });

    const rewritten = response.choices[0].message.content.trim();
    // Remove any quotes wrapping the response
    return rewritten.replace(/^["']|["']$/g, '').trim();
}

/**
 * MAXIMUM Transformation - Target: <10% plagiarism
 * Every possible rule-based technique combined
 */
function advancedFallbackRewrite(text) {
    console.log('⚡ MAXIMUM transformation (all techniques)...');

    let result = aggressiveHumanize(text);

    // DOMAIN-SPECIFIC SYNONYMS (labor/politics)
    const domainSynonyms = {
        'strike': 'work stoppage', 'strikes': 'work stoppages',
        'worker': 'employee', 'workers': 'employees',
        'union': 'labor organization', 'unions': 'labor organizations',
        'bargaining': 'negotiation', 'negotiate': 'discuss terms', 'negotiations': 'discussions',
        'employer': 'management', 'employers': 'management entities',
        'economic': 'financial', 'economy': 'financial system',
        'political': 'governmental', 'politics': 'government affairs',
        'social': 'societal', 'society': 'community',
        'action': 'activity', 'actions': 'activities',
        'pressure': 'influence', 'force': 'power',
        'taxes': 'taxation', 'payment': 'compensation',
        'rally': 'gathering', 'rallies': 'gatherings',
        'march': 'demonstration', 'marches': 'demonstrations',
        'boycott': 'refusal to engage', 'boycotts': 'refusals to engage',
        'disobedience': 'non-compliance', 'civil': 'civic',
        'direct': 'immediate', 'indirect': 'mediated',
        'multi-sector': 'cross-industry', 'solidarity': 'unified',
        'historically': 'in the past', 'primarily': 'mainly',
        'organised': 'coordinated', 'organized': 'coordinated',
        'coalition': 'alliance', 'coalitions': 'alliances',
        'substantial': 'significant', 'common': 'shared',
        'goal': 'objective', 'goals': 'objectives',
        'position': 'stance', 'strengthen': 'reinforce',
        'achieve': 'accomplish', 'exclude': 'leave out',
        'care': 'attention', 'basically': 'fundamentally',
        'exclude': 'omit', 'encompass': 'include',
        'favour': 'support', 'favourable': 'positive',
        'obtained': 'acquired', 'material': 'substantive',
        'interest': 'concern', 'strengthening': 'reinforcing'
    };

    for (const [word, replacement] of Object.entries(domainSynonyms)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, (match) => {
            if (match[0] === match[0].toUpperCase()) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
        });
    }

    // MASSIVE GENERAL SYNONYMS (300+ words)
    const megaSynonyms = {
        'is': 'happens to be', 'are': 'tend to be', 'was': 'ended up being', 'were': 'became',
        'has': 'possesses', 'have': 'possess', 'had': 'possessed',
        'do': 'perform', 'does': 'performs', 'did': 'performed', 'done': 'performed',
        'make': 'create', 'makes': 'creates', 'made': 'created', 'making': 'creating',
        'take': 'acquire', 'takes': 'acquires', 'took': 'acquired', 'taking': 'acquiring',
        'get': 'obtain', 'gets': 'obtains', 'got': 'obtained', 'getting': 'obtaining',
        'give': 'provide', 'gives': 'provides', 'gave': 'provided', 'giving': 'providing',
        'go': 'proceed', 'goes': 'proceeds', 'went': 'proceeded', 'going': 'proceeding',
        'come': 'arrive', 'comes': 'arrives', 'came': 'arrived', 'coming': 'arriving',
        'use': 'utilize', 'uses': 'utilizes', 'used': 'utilized', 'using': 'utilizing',
        'find': 'locate', 'finds': 'locates', 'found': 'located', 'finding': 'locating',
        'know': 'understand', 'knows': 'understands', 'knew': 'understood', 'knowing': 'understanding',
        'think': 'believe', 'thinks': 'believes', 'thought': 'believed', 'thinking': 'believing',
        'see': 'observe', 'sees': 'observes', 'saw': 'observed', 'seeing': 'observing',
        'want': 'desire', 'wants': 'desires', 'wanted': 'desired', 'wanting': 'desiring',
        'look': 'appear', 'looks': 'appears', 'looked': 'appeared', 'looking': 'appearing',
        'work': 'function', 'works': 'functions', 'worked': 'functioned', 'working': 'functioning',
        'call': 'termed', 'called': 'termed', 'calling': 'terming',
        'try': 'attempt', 'tries': 'attempts', 'tried': 'attempted', 'trying': 'attempting',
        'need': 'require', 'needs': 'requires', 'needed': 'required', 'needing': 'requiring',
        'feel': 'sense', 'feels': 'senses', 'felt': 'sensed', 'feeling': 'sensing',
        'become': 'transform into', 'becomes': 'transforms into', 'became': 'transformed into',
        'leave': 'depart', 'leaves': 'departs', 'left': 'departed', 'leaving': 'departing',
        'put': 'place', 'puts': 'places', 'putting': 'placing',
        'mean': 'signify', 'means': 'signifies', 'meant': 'signified', 'meaning': 'signifying',
        'keep': 'maintain', 'keeps': 'maintains', 'kept': 'maintained', 'keeping': 'maintaining',
        'let': 'allow', 'lets': 'allows', 'letting': 'allowing',
        'begin': 'commence', 'begins': 'commences', 'began': 'commenced', 'beginning': 'commencing',
        'seem': 'appear', 'seems': 'appears', 'seemed': 'appeared', 'seeming': 'appearing',
        'help': 'assist', 'helps': 'assists', 'helped': 'assisted', 'helping': 'assisting',
        'show': 'demonstrate', 'shows': 'demonstrates', 'showed': 'demonstrated', 'showing': 'demonstrating',
        'hear': 'perceive', 'hears': 'perceives', 'heard': 'perceived', 'hearing': 'perceiving',
        'play': 'engage in', 'plays': 'engages in', 'played': 'engaged in', 'playing': 'engaging in',
        'run': 'operate', 'runs': 'operates', 'ran': 'operated', 'running': 'operating',
        'move': 'shift', 'moves': 'shifts', 'moved': 'shifted', 'moving': 'shifting',
        'live': 'reside', 'lives': 'resides', 'lived': 'resided', 'living': 'residing',
        'believe': 'regard', 'believes': 'regards', 'believed': 'regarded', 'believing': 'regarding',
        'bring': 'carry', 'brings': 'carries', 'brought': 'carried', 'bringing': 'carrying',
        'happen': 'occur', 'happens': 'occurs', 'happened': 'occurred', 'happening': 'occurring',
        'write': 'compose', 'writes': 'composes', 'wrote': 'composed', 'writing': 'composing',
        'sit': 'be seated', 'sits': 'remains seated', 'sat': 'was seated',
        'stand': 'be upright', 'stands': 'remains upright', 'stood': 'was upright',
        'lose': 'forfeit', 'loses': 'forfeits', 'lost': 'forfeited', 'losing': 'forfeiting',
        'pay': 'compensate', 'pays': 'compensates', 'paid': 'compensated', 'paying': 'compensating',
        'meet': 'encounter', 'meets': 'encounters', 'met': 'encountered', 'meeting': 'encountering',
        'include': 'encompass', 'includes': 'encompasses', 'included': 'encompassed', 'including': 'encompassing',
        'continue': 'proceed', 'continues': 'proceeds', 'continued': 'proceeded', 'continuing': 'proceeding',
        'set': 'establish', 'sets': 'establishes', 'setting': 'establishing',
        'learn': 'acquire knowledge of', 'learns': 'acquires knowledge of', 'learned': 'acquired knowledge of',
        'change': 'alter', 'changes': 'alters', 'changed': 'altered', 'changing': 'altering',
        'lead': 'guide', 'leads': 'guides', 'led': 'guided', 'leading': 'guiding',
        'understand': 'comprehend', 'understands': 'comprehends', 'understood': 'comprehended',
        'watch': 'monitor', 'watches': 'monitors', 'watched': 'monitored', 'watching': 'monitoring',
        'follow': 'pursue', 'follows': 'pursues', 'followed': 'pursued', 'following': 'pursuing',
        'stop': 'cease', 'stops': 'ceases', 'stopped': 'ceased', 'stopping': 'ceasing',
        'create': 'generate', 'creates': 'generates', 'created': 'generated', 'creating': 'generating',
        'speak': 'communicate', 'speaks': 'communicates', 'spoke': 'communicated', 'speaking': 'communicating',
        'read': 'peruse', 'reads': 'peruses', 'reading': 'perusing',
        'allow': 'permit', 'allows': 'permits', 'allowed': 'permitted', 'allowing': 'permitting',
        'add': 'append', 'adds': 'appends', 'added': 'appended', 'adding': 'appending',
        'spend': 'expend', 'spends': 'expends', 'spent': 'expended', 'spending': 'expending',
        'grow': 'expand', 'grows': 'expands', 'grew': 'expanded', 'growing': 'expanding',
        'open': 'unlock', 'opens': 'unlocks', 'opened': 'unlocked', 'opening': 'unlocking',
        'walk': 'ambulate', 'walks': 'ambulates', 'walked': 'ambulated', 'walking': 'ambulating',
        'win': 'succeed', 'wins': 'succeeds', 'won': 'succeeded', 'winning': 'succeeding',
        'offer': 'propose', 'offers': 'proposes', 'offered': 'proposed', 'offering': 'proposing',
        'remember': 'recall', 'remembers': 'recalls', 'remembered': 'recalled', 'remembering': 'recalling',
        'consider': 'contemplate', 'considers': 'contemplates', 'considered': 'contemplated',
        'appear': 'emerge', 'appears': 'emerges', 'appeared': 'emerged', 'appearing': 'emerging',
        'buy': 'purchase', 'buys': 'purchases', 'bought': 'purchased', 'buying': 'purchasing',
        'wait': 'pause', 'waits': 'pauses', 'waited': 'paused', 'waiting': 'pausing',
        'serve': 'function as', 'serves': 'functions as', 'served': 'functioned as', 'serving': 'functioning as',
        'die': 'perish', 'dies': 'perishes', 'died': 'perished', 'dying': 'perishing',
        'send': 'transmit', 'sends': 'transmits', 'sent': 'transmitted', 'sending': 'transmitting',
        'expect': 'anticipate', 'expects': 'anticipates', 'expected': 'anticipated', 'expecting': 'anticipating',
        'build': 'construct', 'builds': 'constructs', 'built': 'constructed', 'building': 'constructing',
        'stay': 'remain', 'stays': 'remains', 'stayed': 'remained', 'staying': 'remaining',
        'fall': 'descend', 'falls': 'descends', 'fell': 'descended', 'falling': 'descending',
        'cut': 'sever', 'cuts': 'severs', 'cutting': 'severing',
        'reach': 'attain', 'reaches': 'attains', 'reached': 'attained', 'reaching': 'attaining',
        'kill': 'terminate', 'kills': 'terminates', 'killed': 'terminated', 'killing': 'terminating',
        'remain': 'stay', 'remains': 'stays', 'remained': 'stayed', 'remaining': 'staying',
        'suggest': 'propose', 'suggests': 'proposes', 'suggested': 'proposed', 'suggesting': 'proposing',
        'raise': 'elevate', 'raises': 'elevates', 'raised': 'elevated', 'raising': 'elevating',
        'pass': 'proceed beyond', 'passes': 'proceeds beyond', 'passed': 'proceeded beyond',
        'sell': 'vend', 'sells': 'vends', 'sold': 'vended', 'selling': 'vending',
        'require': 'necessitate', 'requires': 'necessitates', 'required': 'necessitated',
        'report': 'state', 'reports': 'states', 'reported': 'stated', 'reporting': 'stating',
        'decide': 'determine', 'decides': 'determines', 'decided': 'determined', 'deciding': 'determining',
        'pull': 'draw', 'pulls': 'draws', 'pulled': 'drew', 'pulling': 'drawing',
        'explain': 'clarify', 'explains': 'clarifies', 'explained': 'clarified', 'explaining': 'clarifying',
        'hope': 'wish', 'hopes': 'wishes', 'hoped': 'wished', 'hoping': 'wishing',
        'develop': 'evolve', 'develops': 'evolves', 'developed': 'evolved', 'developing': 'evolving',
        'carry': 'transport', 'carries': 'transports', 'carried': 'transported', 'carrying': 'transporting',
        'break': 'fracture', 'breaks': 'fractures', 'broke': 'fractured', 'breaking': 'fracturing',
        'receive': 'accept', 'receives': 'accepts', 'received': 'accepted', 'receiving': 'accepting',

        // Nouns
        'people': 'individuals', 'person': 'individual', 'man': 'male', 'men': 'males',
        'woman': 'female', 'women': 'females', 'child': 'youth', 'children': 'youths',
        'thing': 'element', 'things': 'elements', 'time': 'moment', 'times': 'moments',
        'way': 'manner', 'ways': 'manners', 'day': 'occasion', 'days': 'occasions',
        'world': 'globe', 'place': 'location', 'places': 'locations',
        'work': 'task', 'case': 'situation', 'cases': 'situations',
        'point': 'matter', 'points': 'matters', 'government': 'administration',
        'company': 'enterprise', 'companies': 'enterprises',
        'number': 'figure', 'numbers': 'figures',
        'group': 'assembly', 'groups': 'assemblies',
        'problem': 'difficulty', 'problems': 'difficulties',
        'fact': 'truth', 'facts': 'truths', 'year': 'annum', 'years': 'annums',

        // Adjectives
        'good': 'favorable', 'great': 'excellent', 'small': 'minor', 'little': 'slight',
        'large': 'substantial', 'high': 'elevated', 'different': 'divergent', 'various': 'diverse',
        'important': 'crucial', 'big': 'major', 'old': 'elderly', 'new': 'novel',
        'long': 'protracted', 'public': 'communal', 'bad': 'unfavorable', 'same': 'equivalent',
        'able': 'capable', 'young': 'juvenile', 'few': 'minimal', 'right': 'correct',
        'best': 'optimal', 'sure': 'certain', 'low': 'reduced',

        // Adverbs
        'very': 'extremely', 'even': 'additionally', 'back': 'reverse',
        'only': 'solely', 'just': 'merely', 'now': 'currently', 'also': 'additionally',
        'well': 'adequately', 'down': 'downward', 'up': 'upward',

        // Prepositions
        'after': 'following', 'before': 'prior to', 'during': 'throughout',
        'under': 'beneath', 'over': 'above', 'between': 'amid',
        'against': 'opposing', 'through': 'via', 'about': 'concerning',
        'around': 'surrounding', 'within': 'inside',

        // Conjunctions
        'but': 'however', 'so': 'therefore', 'because': 'since',
        'though': 'although', 'while': 'whereas',
        'or': 'alternatively', 'than': 'compared to', 'when': 'at the time',
        'where': 'at which location', 'why': 'for what reason',
        'how': 'in what manner', 'both': 'each', 'either': 'one or the other'
    };

    for (const [word, replacement] of Object.entries(megaSynonyms)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, (match) => {
            if (match[0] === match[0].toUpperCase()) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            }
            return replacement;
        });
    }

    // SENTENCE EXPLOSION: Split at EVERY comma and semicolon
    result = result.replace(/,\s*/g, '. ');
    result = result.replace(/;\s*/g, '. ');

    // Split sentences and add fillers AGGRESSIVELY
    let sentences = result.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3);
    sentences = sentences.map((sent, idx) => {
        let words = sent.trim().split(/\s+/);

        // Add TWO fillers to each sentence
        if (words.length > 5) {
            const fillers = ['actually', 'basically', 'essentially', 'generally', 'typically', 'usually', 'frequently', 'commonly', 'often', 'normally', 'regularly'];
            const pos1 = Math.min(2, words.length - 2);
            words.splice(pos1, 0, fillers[Math.floor(Math.random() * fillers.length)]);

            if (words.length > 10) {
                const pos2 = Math.floor(words.length * 0.7);
                words.splice(pos2, 0, fillers[Math.floor(Math.random() * fillers.length)]);
            }
        }

        // Add sentence starters randomly
        if (idx > 0 && Math.random() < 0.4) {
            const starters = ['Additionally', 'Moreover', 'Furthermore', 'Consequently', 'Subsequently', 'Nevertheless', 'Nonetheless'];
            words[0] = starters[Math.floor(Math.random() * starters.length)] + ', ' + words[0].toLowerCase();
        }

        return words.join(' ');
    });

    result = sentences.join('. ');

    // Final cleanup
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s+([.,!?])/g, '$1');
    result = result.replace(/\.{2,}/g, '.');
    result = result.replace(/\.\s+\./g, '.');
    result = result.trim();

    if (!/[.!?]$/.test(result)) {
        result += '.';
    }

    return result;
}

/**
 * Main humanization function
 */
const rewriteText = async (text) => {
    console.log('🚀 Starting text humanization (using Gemini)...');
    console.log(`   Input length: ${text.length} characters`);

    try {
        let result;

        // Try Gemini (Primary)
        try {
            result = await rewriteWithGemini(text);
            result = aggressiveHumanize(result);
            console.log('✅ Humanization complete (Gemini + post-processing)');
            return result;
        } catch (error) {
            console.warn('⚠️ Gemini failed:', error.message.substring(0, 80));
        }

        // Try OpenAI (Fallback if configured, otherwise skip)
        if (openai) {
            try {
                result = await rewriteWithOpenAI(text);
                result = aggressiveHumanize(result);
                console.log('✅ Humanization complete (OpenAI fallback)');
                return result;
            } catch (error) {
                console.warn('⚠️ OpenAI fallback failed:', error.message.substring(0, 80));
            }
        }

        // Fallback to advanced rule-based humanization
        result = advancedFallbackRewrite(text);
        console.log('✅ Humanization complete (Advanced fallback)');
        return result;

    } catch (error) {
        console.error('❌ Humanization error:', error.message);
        // Last resort - apply just the aggressive humanization
        return aggressiveHumanize(text);
    }
};

module.exports = { rewriteText };

