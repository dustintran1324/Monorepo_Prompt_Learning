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

/**
 * Split array into chunks for parallel processing
 */
const chunkArray = (array, numChunks = 4) => {
  const chunks = [];
  const chunkSize = Math.ceil(array.length / numChunks);

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
};

/**
 * Process a single chunk of data with the classification model
 */
const processChunk = async (userPrompt, dataChunk, chatHistory, idKey) => {
  const messages = [
    {
      role: 'system',
      content: `You are a tweet classification system. You MUST respond with ONLY a valid JSON array in this EXACT format:
[{"tweet_id": 905739273827004417, "pred": "humanitarian"}, {"tweet_id": 908840266995466240, "pred": "not_humanitarian"}]

CRITICAL RULES:
- Response must be ONLY the JSON array, no other text before or after
- Use EXACTLY "humanitarian" or "not_humanitarian" for pred values (lowercase, underscore)
- Include ALL tweet_ids from the dataset
- No explanations, no reasoning, no markdown code blocks, no additional text
- Do not wrap in \`\`\`json or any other formatting
- The response should start with [ and end with ]
- If the user's prompt is unclear, still return the JSON format with your best classification attempt

IMPORTANT: Follow the user's classification instructions carefully. Apply their prompt logic to determine if each tweet is humanitarian or not_humanitarian.`
    },
    ...chatHistory,
    {
      role: 'user',
      content: `${userPrompt}\n\nDataset to classify:\n${JSON.stringify(dataChunk, null, 2)}`
    }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.0
  });

  // Parse AI output
  let content = completion.choices[0].message.content;

  // Extract JSON from markdown code blocks if present
  if (content.includes('```json')) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) content = match[1];
  } else if (content.includes('```')) {
    const match = content.match(/```\s*([\s\S]*?)\s*```/);
    if (match) content = match[1];
  }

  // Clean up
  content = content.trim();
  if (content.includes(']')) {
    const lastBracket = content.lastIndexOf(']');
    content = content.substring(0, lastBracket + 1);
  }

  let aiPredictions = JSON.parse(content);

  // Validate and normalize predictions
  aiPredictions = aiPredictions.map(p => {
    if (!p.pred) return p;

    const predLower = p.pred.toLowerCase().trim();
    if (predLower.includes('humanitarian') && !predLower.includes('not')) {
      return { ...p, pred: 'humanitarian' };
    } else if (predLower.includes('not') || predLower.includes('non')) {
      return { ...p, pred: 'not_humanitarian' };
    }
    return p;
  });

  return {
    predictions: aiPredictions,
    usage: completion.usage
  };
};

const simulatePromptOnDataset = async (userPrompt, chatHistory = [], taskType = 'binary', customDataset = null, progressCallback = null) => {
  try {
    let data;
    let labelKey = '';
    let idKey = 'tweet_id';

    // Use custom dataset if provided, otherwise load from file
    if (customDataset) {
      data = customDataset;
      labelKey = customDataset[0]?.label ? 'label' : 'class_label';
      idKey = customDataset[0]?.id ? 'id' : 'tweet_id';
    } else {
      if (taskType === 'binary') {
        data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/binary_sample_small.json')));
        labelKey = 'class_label';
      } else if (taskType === 'multiclass') {
        data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/multiclass_test_small.json')));
        labelKey = 'class_label';
      } else {
        throw new Error('Unknown taskType');
      }
    }

    // Remove labels for classification
    const dataWithoutLabels = data.map(item => {
      const { [labelKey]: _, ...rest } = item;
      return rest;
    });

    console.log(`Processing ${dataWithoutLabels.length} items with parallel chunking...`);
    if (progressCallback) progressCallback({ status: 'chunking', message: `Splitting ${dataWithoutLabels.length} items into chunks...` });

    // Split into 4 chunks for parallel processing
    const chunks = chunkArray(dataWithoutLabels, 4);
    console.log(`Split into ${chunks.length} chunks:`, chunks.map(c => c.length));
    if (progressCallback) progressCallback({ status: 'processing', message: `Processing ${chunks.length} chunks in parallel...`, total: chunks.length, current: 0 });

    // Process all chunks in parallel with progress tracking
    const chunkPromises = chunks.map(async (chunk, index) => {
      const result = await processChunk(userPrompt, chunk, chatHistory, idKey);
      if (progressCallback) progressCallback({ status: 'processing', message: `Chunk ${index + 1}/${chunks.length} completed`, total: chunks.length, current: index + 1 });
      return result;
    });

    const chunkResults = await Promise.all(chunkPromises);

    if (progressCallback) progressCallback({ status: 'merging', message: 'Merging results from all chunks...' });

    // Merge all predictions from chunks
    const allPredictions = chunkResults.flatMap(result => result.predictions);
    const totalUsage = chunkResults.reduce((acc, result) => ({
      prompt_tokens: (acc.prompt_tokens || 0) + (result.usage?.prompt_tokens || 0),
      completion_tokens: (acc.completion_tokens || 0) + (result.usage?.completion_tokens || 0),
      total_tokens: (acc.total_tokens || 0) + (result.usage?.total_tokens || 0)
    }), {});

    console.log(`Merged ${allPredictions.length} predictions from ${chunks.length} chunks`);

    // Merge predictions with original dataset
    const merged = data.map(item => {
      const pred = allPredictions.find(p => p[idKey] === item[idKey]);
      return {
        ...item,
        predicted_label: pred ? (pred.pred || pred.class_label) : null
      };
    });

    // Debug: Check prediction matching
    const successfulMatches = merged.filter(item => item.predicted_label !== null).length;
    console.log(`Successfully matched ${successfulMatches}/${merged.length} predictions`);

    if (successfulMatches === 0) {
      console.log('Sample original IDs:', data.slice(0, 3).map(item => ({ id: item[idKey], type: typeof item[idKey] })));
      console.log('Sample prediction IDs:', allPredictions.slice(0, 3).map(p => ({ id: p[idKey], type: typeof p[idKey] })));
    }

    // Prepare arrays for classification report
    const trueLabels = merged.map(item => item[labelKey]);
    const predictedLabels = merged.map(item => item.predicted_label);

    console.log('True labels sample:', trueLabels.slice(0, 5));
    console.log('Predicted labels sample:', predictedLabels.slice(0, 5));

    if (progressCallback) progressCallback({ status: 'calculating', message: 'Calculating metrics...' });
    const report = classificationReport(trueLabels, predictedLabels);

    if (progressCallback) progressCallback({ status: 'complete', message: 'Classification complete!', report });

    return {
      merged,
      report,
      usage: totalUsage
    };
  } catch (error) {
    console.error('OpenAI simulation error:', error);
    if (progressCallback) progressCallback({ status: 'error', message: error.message });
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

const evaluateAndProvideFeedback = async (userPrompt, llmOutput, chatHistory = [], attempt, taskType, previousContext = null, technique = 'zero-shot') => {
  if (!openai) {
    return {
      feedback: `Demo feedback for attempt ${attempt}. Focus on clear task definition and structured output format.`,
      usage: {}
    };
  }

  try {
    const isLastAttempt = attempt === 3;

    // Technique-specific guidance
    const techniqueContext = {
      'zero-shot': 'The user is using **Zero-Shot prompting**, which relies on clear instructions without examples. This works well for simple tasks but may need more guidance for nuanced classification.',
      'few-shot': 'The user is using **Few-Shot Learning**, which provides labeled examples to guide the model. This is excellent for showing the model what good classifications look like.',
      'chain-of-thought': 'The user is using **Chain-of-Thought prompting**, which asks the model to reason step-by-step. This helps with complex decisions but remember the output should still be just JSON.',
      'structured': 'The user is using **Structured Reasoning**, which breaks classification into systematic steps. This ensures consistent evaluation across all items.'
    };

    const messages = [
      {
        role: 'system',
        content: `You are an expert prompt engineering coach. Your role is to provide clear, actionable feedback that helps users improve their prompts.

CRITICAL RULES FOR YOUR FEEDBACK:
1. DO NOT include technical implementation details like JSON formatting, code blocks, or API syntax in the improved prompt
2. Focus on the CLASSIFICATION LOGIC and DECISION CRITERIA
3. Your improved prompt should read like natural instructions a human would give to another human
4. Be concise and specific - avoid generic advice
5. Acknowledge the prompting technique being used (${technique})

TASK CONTEXT:
The user is learning to prompt an AI to classify Hurricane Irma tweets as "humanitarian" or "not_humanitarian".
- ${techniqueContext[technique] || ''}

GOOD FEEDBACK CHARACTERISTICS:
- Identifies specific issues with clarity, specificity, or logic
- Explains WHY something doesn't work (e.g., "too vague" vs "vague prompts work poorly")
- Provides concrete examples of improvements
- Balances encouragement with constructive criticism
- Improved prompts should be CLEAN and USER-FOCUSED (no JSON, no technical formatting instructions)

${isLastAttempt
  ? 'FINAL ATTEMPT - Provide a learning summary with key takeaways about prompt engineering principles.'
  : `BINARY CLASSIFICATION PRINCIPLES:
- Clear definitions work better than exhaustive rules
- Focus on INTENT and IMPACT, not keyword matching
- Simple > Complex for most classification tasks
- Examples are powerful teachers (especially with few-shot learning)
- "humanitarian" = actionable disaster relief information (warnings, requests, damage reports, aid offers)
- "not_humanitarian" = everything else (opinions, commentary, unrelated content)`
}`
      },
      ...chatHistory,
      {
        role: 'user',
        content: `
CURRENT ATTEMPT: ${attempt} of 3
TECHNIQUE USED: ${technique}
USER'S PROMPT: "${userPrompt}"
RESULTS: "${llmOutput}"

${previousContext ? `
PREVIOUS ATTEMPTS:
${previousContext.map((ctx) => `
Attempt ${ctx.attempt}: ${ctx.performance}
`).join('\n')}

Compare current performance with previous attempts. If performance declined, explain why. If improved, acknowledge what worked.
` : ''}

${isLastAttempt ? `
Provide a comprehensive learning summary:
1. Key lessons learned about prompt engineering
2. What techniques improved performance
3. Common mistakes to avoid
4. How to apply these principles to other tasks

Format with **bold headers** and bullet points (•).
` : `
Provide your feedback in this structure:

### Guidance and Feedback

**Technique Used**: Acknowledge they're using ${technique}

**What Worked**: Specific positive elements (if any)

**What Needs Improvement**: Specific issues with their prompt (e.g., vague language, missing context, unclear criteria)

**Why Performance Is X%**: Brief explanation tied to specific prompt weaknesses/strengths

### Improved Prompt

Provide a CLEAN, NATURAL improved version that:
- Reads like instructions to a human helper
- Focuses purely on the classification task and criteria
- Does NOT include JSON formatting, code syntax, or technical details
- Incorporates the ${technique} technique effectively
- Is clear, specific, and actionable

REMEMBER: The improved prompt should be the classification instructions ONLY. No JSON, no code blocks, no "output format" - just the decision logic.
`}`
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
