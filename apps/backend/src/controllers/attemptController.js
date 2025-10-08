const { processPromptAttempt, getUserAttempts, getAttemptChatHistory } = require('../services/promptService');

const submitAttempt = async (req, res, next) => {
  try {
    const { userId, prompt, attemptNumber, attempt, taskType, feedbackLevel } = req.body;

    // Support both 'attemptNumber' and 'attempt' field names for compatibility
    const attemptNum = attemptNumber || attempt || 1;
    const feedback = feedbackLevel || 'llm';

    console.log('Received attempt submission:', {
      userId,
      attemptNumber: attemptNum,
      promptLength: prompt?.length,
      taskType,
      feedbackLevel: feedback
    });

    const result = await processPromptAttempt(userId, prompt, attemptNum, taskType, feedback);

    res.status(200).json({
      success: true,
      message: 'Prompt processed successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in submitAttempt:', error);
    next(error);
  }
};

const getAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    console.log('Getting attempts for user:', userId);
    
    const attempts = await getUserAttempts(userId);
    
    res.status(200).json({
      success: true,
      message: 'Attempts retrieved successfully',
      data: attempts
    });
  } catch (error) {
    console.error('Error in getAttempts:', error);
    next(error);
  }
};

const getChatHistory = async (req, res, next) => {
  try {
    const { userId, attemptNumber } = req.params;
    
    console.log('Getting chat history for:', { userId, attemptNumber });
    
    const chatHistory = await getAttemptChatHistory(userId, parseInt(attemptNumber));
    
    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: chatHistory
    });
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    next(error);
  }
};

module.exports = {
  submitAttempt,
  getAttempts,
  getChatHistory
};