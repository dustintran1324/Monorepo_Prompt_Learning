const { body, param, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateAttemptSubmission = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1-100 characters'),
  
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isString()
    .withMessage('Prompt must be a string')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Prompt must be between 10-2000 characters'),
  
  body('attemptNumber')
    .isInt({ min: 1, max: 3 })
    .withMessage('Attempt number must be between 1-3'),
  
  body('taskType')
    .optional()
    .isIn(['binary', 'multiclass', 'multilabel'])
    .withMessage('Task type must be binary, multiclass, or multilabel'),
  
  handleValidationErrors
];

const validateUserIdParam = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1-100 characters'),
  
  handleValidationErrors
];

const validateAttemptNumberParam = [
  param('attemptNumber')
    .isInt({ min: 1, max: 3 })
    .withMessage('Attempt number must be between 1-3'),
  
  handleValidationErrors
];

module.exports = {
  validateAttemptSubmission,
  validateUserIdParam,
  validateAttemptNumberParam,
  handleValidationErrors
};