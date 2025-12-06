const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    originalText: {
        type: String,
        required: true,
    },
    highlights: [
        {
            text: String,
            type: {
                type: String,
                enum: ['plagiarized', 'paraphrased', 'safe'],
            },
            source: String,
            score: Number,
        },
    ],
    overallScore: {
        type: Number,
        required: true,
    },
    rewrittenText: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('History', historySchema);
