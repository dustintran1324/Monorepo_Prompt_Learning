const { processPromptAttempt } = require('../services/promptService');

// Store active SSE connections
const activeConnections = new Map();

const submitAttemptSSE = async (req, res) => {
  const { userId, prompt, attemptNumber, attempt, taskType, feedbackLevel, technique } = req.body;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const connectionId = `${userId}-${Date.now()}`;
  activeConnections.set(connectionId, res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', connectionId })}\n\n`);

  try {
    const attemptNum = attemptNumber || attempt || 1;
    const feedback = feedbackLevel || 'llm';
    const promptTechnique = technique || 'zero-shot';

    console.log('SSE: Received attempt submission:', {
      userId,
      attemptNumber: attemptNum,
      promptLength: prompt?.length,
      taskType,
      feedbackLevel: feedback,
      technique: promptTechnique
    });

    // Send progress update
    res.write(`data: ${JSON.stringify({ type: 'progress', status: 'started', message: 'Processing your prompt...' })}\n\n`);

    // Progress callback for real-time updates
    const sendProgress = (progressData) => {
      const message = progressData.message || 'Processing...';
      res.write(`data: ${JSON.stringify({ type: 'progress', ...progressData, message })}\n\n`);
    };

    const result = await processPromptAttempt(userId, prompt, attemptNum, taskType, feedback, promptTechnique, sendProgress);

    // Send success result immediately
    res.write(`data: ${JSON.stringify({ type: 'complete', data: result.data })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'close' })}\n\n`);

    activeConnections.delete(connectionId);
    res.end();
  } catch (error) {
    console.error('Error in submitAttemptSSE:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'close' })}\n\n`);
    activeConnections.delete(connectionId);
    res.end();
  }
};

module.exports = {
  submitAttemptSSE
};
