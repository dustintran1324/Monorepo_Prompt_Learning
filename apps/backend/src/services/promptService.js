const openaiService = require('./openaiService');
const Attempt = require('../models/Attempt');
const { prepareForClassification } = require('./promptingTechniques');

function formatClassificationReport(report, merged) {
  const overall = report.overall || {};
  return `**Classification Performance:**
• Accuracy: ${(overall.accuracy * 100).toFixed(1)}% — the percentage of tweets the AI labeled correctly out of all tweets.
• Macro F1-Score: ${(overall.macroF1 * 100).toFixed(1)}% — a balance of precision and recall, showing how well the AI did overall across both categories.
• Macro Precision: ${(overall.macroPrecision * 100).toFixed(1)}% — when the AI predicted a category, how often it was correct.
• Macro Recall: ${(overall.macroRecall * 100).toFixed(1)}% — out of all tweets that truly belong to a category, how many the AI correctly identified.

Predictions were made on ${merged.length} tweets.`;
}

// Helper to get previous attempt context for better feedback
async function getPreviousAttemptContext(userId, currentAttempt) {
  try {
    const previousAttempts = await Attempt.find({
      userId,
      attempt: { $lt: currentAttempt }
    }).sort({ attempt: 1 });

    if (previousAttempts.length === 0) return null;

    const context = previousAttempts.map(att => ({
      attempt: att.attempt,
      prompt: att.prompt.substring(0, 150), // Shorter prompt preview
      performance: att.llmOutput // Just metrics, no feedback
    }));

    return context;
  } catch (error) {
    console.error('Error getting previous context:', error);
    return null;
  }
}

async function processPromptAttempt(userId, prompt, attemptNumber, taskType = 'binary', feedbackLevel = 'llm', technique = 'zero-shot', progressCallback = null) {
  const startTime = Date.now();

  // Normalize attempt number to 1, 2, 3 cycle for testing
  const normalizedAttempt = ((attemptNumber - 1) % 3) + 1;
  console.log(`Original attempt: ${attemptNumber}, Normalized attempt: ${normalizedAttempt}`);

  // Prepare user prompt for classification (only adds output format, no enhancements)
  const classificationPrompt = prepareForClassification(prompt);
  console.log(`Technique for feedback: ${technique}`);

  if (progressCallback) progressCallback({ status: 'loading', message: 'Loading previous attempts...' });

  try {
    // Only load previous attempts for normalized attempts > 1
    let chatHistory = [];
    if (normalizedAttempt > 1) {
      const previousAttempts = await Attempt.find({
        userId,
        attempt: { $lt: normalizedAttempt }
      })
        .sort({ attempt: 1 })
        .select('chatHistory');

      // Build cumulative chat history (limit to prevent token overflow)
      previousAttempts.forEach(att => {
        if (att.chatHistory) {
          chatHistory.push(...att.chatHistory);
        }
      });

      // Limit chat history to last 10 messages to prevent token overflow
      if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
      }
    }

    if (progressCallback) progressCallback({ status: 'classifying', message: 'Running classification on dataset...' });

    // Pass user's prompt (with output format only) to classification
    const simulationResult = await openaiService.simulatePromptOnDataset(
      classificationPrompt,
      chatHistory,
      taskType,
      null,
      progressCallback
    );

    chatHistory.push({
      role: 'user',
      content: prompt,
      timestamp: new Date()
    });

    // Store formatted report as assistant response
    const formattedReport = formatClassificationReport(simulationResult.report, simulationResult.merged);
    chatHistory.push({
      role: 'assistant',
      content: formattedReport,
      timestamp: new Date()
    });

    // Run feedback generation and database save in parallel to reduce latency
    if (progressCallback) progressCallback({ status: 'feedback', message: 'Generating AI feedback...' });

    let feedbackPromise = Promise.resolve({ feedback: '', usage: {} });

    if (feedbackLevel === 'llm') {
      // Start feedback generation immediately (don't await yet)
      const previousContext = normalizedAttempt > 1 ? await getPreviousAttemptContext(userId, normalizedAttempt) : null;

      feedbackPromise = openaiService.evaluateAndProvideFeedback(
        prompt,
        formattedReport,
        chatHistory,
        normalizedAttempt,
        taskType,
        previousContext,
        technique
      );
    } else if (feedbackLevel === 'fixed') {
      feedbackPromise = Promise.resolve({
        feedback: `
Good prompts should:
- Include a structured response format with explicit output examples
- Include example tweets with their labels
- Describe the nature of the tweets
- Include keywords and emphasize important actions
- Tell the model its role as an expert
- Include labeled examples with reasoning
- Ask the model to think or reason carefully (but not to include reasoning in output)
- Guide model reasoning into defined steps`,
        usage: {}
      });
    }

    // Wait for feedback to complete
    const evaluationResult = await feedbackPromise;
    const feedback = evaluationResult.feedback;
    const evaluationUsage = evaluationResult.usage;

    if (feedback && feedbackLevel === 'llm') {
      chatHistory.push({
        role: 'assistant',
        content: feedback,
        timestamp: new Date()
      });
    }

    if (progressCallback) progressCallback({ status: 'saving', message: 'Saving results...' });

    const processingTime = Date.now() - startTime;

    // Upsert attempt document
    const doc = {
      userId,
      attempt: normalizedAttempt,
      prompt,
      llmOutput: formattedReport,
      feedback,
      chatHistory,
      predictions: { items: simulationResult.merged },
      metadata: {
        promptTokens: (simulationResult.usage?.prompt_tokens || 0) +
                     (evaluationUsage?.prompt_tokens || 0),
        completionTokens: (simulationResult.usage?.completion_tokens || 0) +
                         (evaluationUsage?.completion_tokens || 0),
        totalTokens: (simulationResult.usage?.total_tokens || 0) +
                    (evaluationUsage?.total_tokens || 0),
        model: 'gpt-4o-mini',
        processingTimeMs: processingTime,
        taskType,
        feedbackLevel
      }
    };

    const attemptDoc = await Attempt.findOneAndUpdate(
      { userId, attempt: normalizedAttempt },
      { $set: doc },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Calculate metrics from report for frontend
    const overall = simulationResult.report.overall || {};
    const metrics = {
      accuracy: overall.accuracy || 0,
      precision: overall.macroPrecision || 0,
      recall: overall.macroRecall || 0,
      f1Score: overall.macroF1 || 0
    };

    return {
      success: true,
      data: {
        attempt: normalizedAttempt,
        llmOutput: formattedReport,
        feedback,
        predictions: simulationResult.merged,
        metrics,
        metadata: attemptDoc.metadata
      }
    };

  } catch (error) {
    console.error('Prompt processing error:', error);
    throw new Error(`Failed to process prompt attempt: ${error.message}`);
  }
}

async function getUserAttempts(userId) {
  try {
    const attempts = await Attempt.find({ userId })
      .sort({ attempt: 1 })
      .select('-__v');

    return attempts;
  } catch (error) {
    console.error('Error getting user attempts:', error);
    throw new Error(`Failed to get user attempts: ${error.message}`);
  }
}

async function getAttemptChatHistory(userId, attemptNumber) {
  try {
    const attempt = await Attempt.findOne({ userId, attempt: attemptNumber })
      .select('chatHistory');

    if (!attempt) {
      return [];
    }

    return attempt.chatHistory || [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw new Error(`Failed to get chat history: ${error.message}`);
  }
}

module.exports = {
  processPromptAttempt,
  getUserAttempts,
  getAttemptChatHistory
};
