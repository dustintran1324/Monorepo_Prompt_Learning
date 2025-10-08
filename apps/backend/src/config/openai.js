const { OpenAI } = require('openai');

let openai = null;

if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('OpenAI client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error.message);
  }
} else {
  console.warn('OPENAI_API_KEY not found - running in demo mode');
}

module.exports = openai;