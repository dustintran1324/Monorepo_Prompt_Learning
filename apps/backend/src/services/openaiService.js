const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Safely initialize OpenAI client
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not found in environment variables');
    openai = null;
  } else {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('OpenAI client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error.message);
  openai = null;
}

const simulatePromptOnDataset = async (userPrompt, chatHistory = [], taskType = 'binary') => {
  try {
    let data;
    let labelKey = '';
    let idKey = 'tweet_id';

    if (taskType === 'binary') {
      data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/binary_sample_small.json')));
      labelKey = 'class_label';
    } else if (taskType === 'multiclass') {
      data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/multiclass_test_small.json')));
      labelKey = 'class_label';
    } else {
      throw new Error('Unknown taskType');
    }

    // Remove labels for prompt
    const dataWithoutLabels = Array.isArray(data)
      ? data.map(item => {
          const { [labelKey]: _, ...rest } = item;
          return rest;
        })
      : data;

    const datasetText = JSON.stringify(dataWithoutLabels, null, 2);

    const messages = [
      {
        role: 'system',
        content: `You are a tweet classification system. You MUST respond with ONLY a valid JSON array in this EXACT format:
[{"tweet_id": 905739273827004417, "pred": "humanitarian"}, {"tweet_id": 908840266995466240, "pred": "not_humanitarian"}]

CRITICAL RULES:
- Response must be ONLY the JSON array, no other text
- Use exactly "humanitarian" or "not_humanitarian" for pred values
- Include ALL tweet_ids from the dataset
- No explanations, no markdown formatting, no additional text
- If the user's prompt is unclear, still return the JSON format with your best classification attempt`
      },
      ...chatHistory,
      {
        role: 'user',
        content: `${userPrompt}\nDataset: ${datasetText}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.0
    });

    console.log('\n=== CHATGPT RAW RESPONSE START ===');
    console.log(completion.choices[0].message.content);
    console.log('=== CHATGPT RAW RESPONSE END ===\n');

    // Parse AI output (should be a JSON array)
    let aiPredictions;
    try {
      let content = completion.choices[0].message.content;

      // Extract JSON from markdown code blocks if present
      if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          content = match[1];
        }
      } else if (content.includes('```')) {
        const match = content.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          content = match[1];
        }
      }

      // Clean up any remaining text after the JSON array
      content = content.trim();
      if (content.includes(']')) {
        const lastBracket = content.lastIndexOf(']');
        content = content.substring(0, lastBracket + 1);
      }

      console.log('Parsed content for JSON:', content.substring(0, 200) + '...');
      aiPredictions = JSON.parse(content);
      console.log(`Parsed ${aiPredictions.length} predictions`);

      // Validate that we got predictions for all tweets
      if (!Array.isArray(aiPredictions) || aiPredictions.length === 0) {
        throw new Error('No predictions returned');
      }
    } catch (e) {
      console.error('JSON parsing failed:', e.message);
      console.error('AI Raw Output:', completion.choices[0].message.content.substring(0, 200) + '...');

      // User-friendly error message
      throw new Error(`The AI couldn't understand your prompt instructions. Please make sure your prompt:
1. Asks for classification of tweets as "humanitarian" or "not_humanitarian"
2. Requests output in JSON format: [{"tweet_id": 123, "pred": "humanitarian"}]
3. Is clear and specific about the task

Original AI response started with: "${completion.choices[0].message.content.substring(0, 100)}..."`);
    }

    // Merge predictions with original dataset using tweet_id
    const merged = data.map(item => {
      const pred = aiPredictions.find(p => p[idKey] === item[idKey]);
      return {
        ...item,
        predicted_label: pred ? pred.class_label || pred.pred : null
      };
    });

    // Debug: Check prediction matching
    const successfulMatches = merged.filter(item => item.predicted_label !== null).length;
    console.log(`Successfully matched ${successfulMatches}/${merged.length} predictions`);

    if (successfulMatches === 0) {
      console.log('Sample original tweet IDs:', data.slice(0, 3).map(item => ({ id: item[idKey], type: typeof item[idKey] })));
      console.log('Sample prediction IDs:', aiPredictions.slice(0, 3).map(p => ({ id: p[idKey], type: typeof p[idKey] })));
    }

    // Prepare arrays for classification report
    const trueLabels = merged.map(item => item[labelKey]);
    const predictedLabels = merged.map(item => item.predicted_label);

    console.log('True labels sample:', trueLabels.slice(0, 5));
    console.log('Predicted labels sample:', predictedLabels.slice(0, 5));

    const report = classificationReport(trueLabels, predictedLabels);

    return {
      merged,
      report,
      usage: completion.usage
    };
  } catch (error) {
    console.error('OpenAI simulation error:', error);
    throw new Error(`Failed to simulate prompt: ${error.message}`);
  }
};

const classificationReport = (trueLabels, predictedLabels) => {
  const classes = Array.from(new Set([...trueLabels, ...predictedLabels]));
  const report = {};
  let totalTP = 0, totalFP = 0, totalFN = 0, totalSupport = 0;

  classes.forEach(cls => {
    const tp = trueLabels.filter((t, i) => t === cls && predictedLabels[i] === cls).length;
    const fp = predictedLabels.filter((p, i) => p === cls && trueLabels[i] !== cls).length;
    const fn = trueLabels.filter((t, i) => t === cls && predictedLabels[i] !== cls).length;
    const support = trueLabels.filter(t => t === cls).length;

    totalTP += tp;
    totalFP += fp;
    totalFN += fn;
    totalSupport += support;

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);

    report[cls] = { precision, recall, f1, support };
  });

  // Overall metrics (macro average)
  const macroPrecision = classes.reduce((sum, cls) => sum + report[cls].precision, 0) / classes.length;
  const macroRecall = classes.reduce((sum, cls) => sum + report[cls].recall, 0) / classes.length;
  const macroF1 = classes.reduce((sum, cls) => sum + report[cls].f1, 0) / classes.length;

  // Overall accuracy
  const accuracy = trueLabels.filter((t, i) => t === predictedLabels[i]).length / trueLabels.length;

  report['overall'] = {
    accuracy,
    macroPrecision,
    macroRecall,
    macroF1
  };

  return report;
};

const evaluateAndProvideFeedback = async (userPrompt, llmOutput, chatHistory = [], attempt, taskType, previousContext = null) => {
  if (!openai) {
    return {
      feedback: `Demo feedback for attempt ${attempt}. Focus on clear task definition and structured output format.`,
      usage: {}
    };
  }

  try {
    const isLastAttempt = attempt === 3;
    const messages = [
      {
        role: 'system',
        content: `You are an expert AI assistant specializing in prompt engineering. Your task is to evaluate a classification prompt, give suggestions, and write an improved version.
The original instructions for the prompter were prompt a model to determine whether a Hurricane Irma tweet is humanitarian or not, returning humanitarian or not_humanitarian.

${isLastAttempt
  ? 'FINAL ATTEMPT - Focus on GENERAL prompt engineering principles and provide a learning summary.'
  : `FOR BINARY CLASSIFICATION specifically:
- Simple, clear categories work better than over-detailed definitions
- Too many rules can constrain the model's natural language understanding
- Focus on INTENT and ACTION rather than specific word lists
- "humanitarian" = direct help/aid/relief actions and requests
- "not_humanitarian" = everything else (news, opinions, unrelated)
- JSON format: [{"tweet_id": 123, "pred": "humanitarian"}]

Good prompts should:
- Include a clear response format with examples
- Include example tweets with their labels
- Explain the task context briefly
- Tell the model its role as an expert
- Ask the model to think carefully but only output the classification`
}`
      },
      ...chatHistory,
      {
        role: 'user',
        content: `
User Prompt: "${userPrompt}"
Results: "${llmOutput}"
This is attempt ${attempt} of 3.

${previousContext ? `
PREVIOUS ATTEMPTS CONTEXT:
${previousContext.map((ctx) => `
Attempt ${ctx.attempt}:
Prompt: "${ctx.prompt}..."
Performance: ${ctx.performance}
`).join('\n')}

** Important: Compare current performance with previous attempts. If performance DECLINED, explain why (e.g., over-constraining the model, too many specific rules). If performance IMPROVED, acknowledge what worked. **
` : ''}

${isLastAttempt ? `
Provide a comprehensive learning summary covering:
1. What they learned about prompt engineering
2. Key techniques that improved performance
3. Common mistakes to avoid
4. How to apply these principles to other classification tasks

Then provide ### Key Takeaways for Future Use with general prompt engineering principles.

FORMATTING: Use **bold text** for section headers, NOT standalone # characters. Use bullet points with • or -.
` : `
Take note of the F1 results and account for any classification outliers. If performance declined from previous attempts, explain why over-specification might hurt binary classification.
Rewrite the prompt and return a better version, indicating with "### Improved Prompt".
The rewritten prompt should ask the model to output JSON format only, with NO reasoning provided in the output.
`}

Begin your feedback with ### Guidance and Feedback:. Using **headers** for emphasis (use **text** not # for subheadings). Be detailed and educational.`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      feedback: completion.choices[0].message.content,
      usage: completion.usage
    };
  } catch (error) {
    console.error('OpenAI evaluation error:', error);
    throw new Error(`Failed to generate feedback: ${error.message}`);
  }
};

module.exports = {
  simulatePromptOnDataset,
  evaluateAndProvideFeedback,
  classificationReport
};