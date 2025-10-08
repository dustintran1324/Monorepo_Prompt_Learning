const Attempt = require('../models/Attempt');
const { simulateDatasetRun, generateFeedback, classificationReport } = require('./openaiService');

const processPromptAttempt = async (userId, prompt, attemptNumber, taskType = 'binary') => {
  try {
    console.log(`Processing attempt ${attemptNumber} for user ${userId}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Task type: ${taskType}`);

    const { predictions, demoMode } = await simulateDatasetRun(prompt, taskType);
    
    const metrics = classificationReport(predictions);
    console.log('Metrics calculated:', metrics);

    const feedback = await generateFeedback(prompt, predictions, attemptNumber, taskType);
    console.log('Feedback generated:', feedback.substring(0, 100) + '...');

    const chatHistory = [
      {
        role: 'user',
        content: prompt,
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: feedback,
        timestamp: new Date()
      }
    ];

    const existingAttempt = await Attempt.findOne({ userId, attempt: attemptNumber });
    
    let attemptDoc;
    if (existingAttempt) {
      console.log('Updating existing attempt');
      attemptDoc = await Attempt.findOneAndUpdate(
        { userId, attempt: attemptNumber },
        {
          prompt,
          llmOutput: { predictions, demoMode },
          feedback,
          chatHistory,
          predictions: { items: predictions },
          metrics,
          taskType,
          completed: true
        },
        { new: true, upsert: true }
      );
    } else {
      console.log('Creating new attempt');
      attemptDoc = new Attempt({
        userId,
        attempt: attemptNumber,
        prompt,
        llmOutput: { predictions, demoMode },
        feedback,
        chatHistory,
        predictions: { items: predictions },
        metrics,
        taskType,
        completed: true
      });
      await attemptDoc.save();
    }

    console.log('Attempt saved successfully');

    return {
      success: true,
      attemptId: attemptDoc._id,
      predictions,
      feedback,
      metrics,
      chatHistory,
      demoMode: demoMode || false
    };
  } catch (error) {
    console.error('Error in processPromptAttempt:', error);
    throw new Error(`Failed to process prompt attempt: ${error.message}`);
  }
};

const getUserAttempts = async (userId) => {
  try {
    const attempts = await Attempt.find({ userId })
      .sort({ attempt: 1 })
      .select('-__v');
    
    return attempts;
  } catch (error) {
    console.error('Error getting user attempts:', error);
    throw new Error(`Failed to get user attempts: ${error.message}`);
  }
};

const getAttemptChatHistory = async (userId, attemptNumber) => {
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
};

module.exports = {
  processPromptAttempt,
  getUserAttempts,
  getAttemptChatHistory
};