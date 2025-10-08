const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  attempt: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  prompt: {
    type: String,
    required: true
  },
  llmOutput: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  feedback: {
    type: String,
    required: true
  },
  chatHistory: [chatMessageSchema],
  predictions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number
  },
  taskType: {
    type: String,
    default: 'binary',
    enum: ['binary', 'multiclass', 'multilabel']
  },
  completed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'attempts'
});

attemptSchema.index({ userId: 1, attempt: 1 }, { unique: true });

const Attempt = mongoose.model('Attempt', attemptSchema);

module.exports = Attempt;