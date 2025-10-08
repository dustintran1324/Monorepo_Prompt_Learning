const openai = require('../config/openai');

const SAMPLE_DATASET = [
  { text: "This movie was absolutely fantastic!", label: "positive" },
  { text: "I really hated this film", label: "negative" },
  { text: "The acting was superb and the plot engaging", label: "positive" },
  { text: "Boring and predictable storyline", label: "negative" },
  { text: "One of the best movies I've ever seen", label: "positive" }
];

const simulateDatasetRun = async (prompt, taskType = 'binary') => {
  if (!openai) {
    return {
      predictions: SAMPLE_DATASET.map((item, index) => ({
        id: index,
        text: item.text,
        predicted: Math.random() > 0.5 ? 'positive' : 'negative',
        actual: item.label,
        confidence: Math.random()
      })),
      demoMode: true
    };
  }

  try {
    const systemPrompt = `You are evaluating a prompt for ${taskType} classification. 
The user's prompt is: "${prompt}"

For each text sample, provide your classification and confidence (0-1).`;
    
    const predictions = [];
    
    for (const [index, item] of SAMPLE_DATASET.entries()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Classify this text: "${item.text}"` }
          ],
          temperature: 0.1,
          max_tokens: 100
        });

        const result = response.choices[0].message.content.toLowerCase();
        const predicted = result.includes('positive') ? 'positive' : 'negative';
        const confidence = Math.random() * 0.3 + 0.7;

        predictions.push({
          id: index,
          text: item.text,
          predicted,
          actual: item.label,
          confidence: confidence
        });
      } catch (error) {
        console.error(`Error processing item ${index}:`, error.message);
        predictions.push({
          id: index,
          text: item.text,
          predicted: Math.random() > 0.5 ? 'positive' : 'negative',
          actual: item.label,
          confidence: 0.5,
          error: true
        });
      }
    }

    return { predictions, demoMode: false };
  } catch (error) {
    console.error('Error in simulateDatasetRun:', error.message);
    throw error;
  }
};

const generateFeedback = async (prompt, predictions, attemptNumber, taskType = 'binary') => {
  if (!openai) {
    return `Demo feedback for attempt ${attemptNumber}: Your prompt "${prompt}" shows promise for ${taskType} classification. Consider being more specific about the classification criteria and providing examples for better results.`;
  }

  try {
    const correct = predictions.filter(p => p.predicted === p.actual).length;
    const accuracy = (correct / predictions.length * 100).toFixed(1);
    
    const systemPrompt = `You are an expert in prompt engineering for ${taskType} classification tasks. 
Provide constructive feedback to help improve the user's prompting skills.

Analyze the prompt: "${prompt}"
Accuracy achieved: ${accuracy}%
Attempt: ${attemptNumber}/3

Provide specific, actionable feedback in 2-3 sentences focusing on:
1. What worked well
2. Specific improvements for better accuracy
3. Advanced techniques for attempt ${attemptNumber + 1}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please provide feedback on this prompt." }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating feedback:', error.message);
    return `Unable to generate detailed feedback. Your prompt "${prompt}" achieved ${((predictions.filter(p => p.predicted === p.actual).length / predictions.length) * 100).toFixed(1)}% accuracy. Try being more specific about classification criteria.`;
  }
};

const classificationReport = (predictions) => {
  const correct = predictions.filter(p => p.predicted === p.actual).length;
  const total = predictions.length;
  const accuracy = correct / total;

  const positiveTP = predictions.filter(p => p.actual === 'positive' && p.predicted === 'positive').length;
  const positiveFP = predictions.filter(p => p.actual === 'negative' && p.predicted === 'positive').length;
  const positiveFN = predictions.filter(p => p.actual === 'positive' && p.predicted === 'negative').length;

  const precision = positiveTP / (positiveTP + positiveFP) || 0;
  const recall = positiveTP / (positiveTP + positiveFN) || 0;
  const f1Score = (2 * precision * recall) / (precision + recall) || 0;

  return {
    accuracy: parseFloat(accuracy.toFixed(4)),
    precision: parseFloat(precision.toFixed(4)),
    recall: parseFloat(recall.toFixed(4)),
    f1Score: parseFloat(f1Score.toFixed(4))
  };
};

module.exports = {
  simulateDatasetRun,
  generateFeedback,
  classificationReport
};