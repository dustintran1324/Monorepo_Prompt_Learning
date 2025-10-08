const express = require('express');
const { submitAttempt, getAttempts, getChatHistory, getTechniques } = require('../controllers/attemptController');
const { validateAttemptSubmission, validateUserIdParam, validateAttemptNumberParam } = require('../middleware/validation');

const router = express.Router();

router.post('/submit', validateAttemptSubmission, submitAttempt);

router.get('/user/:userId', validateUserIdParam, getAttempts);

router.get('/user/:userId/attempt/:attemptNumber/chat',
  validateUserIdParam,
  validateAttemptNumberParam,
  getChatHistory
);

router.get('/techniques', getTechniques);

module.exports = router;