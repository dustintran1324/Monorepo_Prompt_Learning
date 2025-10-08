// Service for different prompting technique templates and strategies

const FEW_SHOT_EXAMPLES = [
  {
    tweet_id: 905739273827004417,
    tweet_text: "Miami-Dade orders coastal evacuation as Hurricane Irma threatens CLICK BELOW FOR FULL STORY",
    pred: "humanitarian",
    reasoning: "Direct evacuation order - critical safety information"
  },
  {
    tweet_id: 908752246543994881,
    tweet_text: "@joenapoli7 @JohnKasich Look @ Moonbeams law on sex trafficked children! Opens flood gates wide open! #WeRAwake #WeRWatchingU #SaveOurChildren",
    pred: "not_humanitarian",
    reasoning: "Political commentary unrelated to disaster relief"
  },
  {
    tweet_id: 906519111278235649,
    tweet_text: "Calling all nurses! Florida is in desperate need in assistance. #Irma",
    pred: "humanitarian",
    reasoning: "Direct call for medical assistance - actionable aid request"
  },
  {
    tweet_id: 908281118192832512,
    tweet_text: "You are not alone there are plenty of rolling stones. There was a wave in 2014 expect Tsunami in 2019.",
    pred: "not_humanitarian",
    reasoning: "General statement without specific disaster relief information"
  }
];

/**
 * Enhances user prompt with zero-shot technique
 * Adds role definition and clear output format
 */
function applyZeroShot(userPrompt) {
  return `You are an expert disaster response classifier.

${userPrompt}

Output format: Return ONLY a JSON array with this structure:
[{"tweet_id": <id>, "pred": "humanitarian" or "not_humanitarian"}]`;
}

/**
 * Enhances user prompt with few-shot examples
 * Provides labeled examples before the task
 */
function applyFewShot(userPrompt) {
  const examplesText = FEW_SHOT_EXAMPLES.map(ex =>
    `Tweet: "${ex.tweet_text}"\nLabel: ${ex.pred}\nReasoning: ${ex.reasoning}`
  ).join('\n\n');

  return `You are an expert disaster response classifier.

Here are some examples of correctly classified tweets:

${examplesText}

Now apply the same classification logic:
${userPrompt}

Output format: Return ONLY a JSON array with this structure:
[{"tweet_id": <id>, "pred": "humanitarian" or "not_humanitarian"}]`;
}

/**
 * Enhances user prompt with chain-of-thought reasoning
 * Asks model to think step-by-step but output only classification
 */
function applyChainOfThought(userPrompt) {
  return `You are an expert disaster response classifier.

${userPrompt}

For each tweet, think through:
1. Does it provide actionable disaster relief information?
2. Does it request or offer help/aid/resources?
3. Does it contain safety warnings or damage reports?
4. Or is it just commentary, opinion, or unrelated content?

Based on your reasoning, classify each tweet. Output ONLY the final JSON array (no reasoning in output):
[{"tweet_id": <id>, "pred": "humanitarian" or "not_humanitarian"}]`;
}

/**
 * Enhances user prompt with structured reasoning
 * Breaks down the classification into clear steps
 */
function applyStructuredReasoning(userPrompt) {
  return `You are an expert disaster response classifier. Follow this systematic approach:

STEP 1: Read the user's classification criteria
${userPrompt}

STEP 2: For each tweet, evaluate:
- Primary intent: Information sharing, help request, aid offer, or commentary?
- Action orientation: Does it enable disaster response actions?
- Humanitarian value: Useful for relief efforts?

STEP 3: Apply binary classification
- "humanitarian" = Useful for disaster relief (warnings, damage reports, aid requests/offers, evacuation info)
- "not_humanitarian" = Everything else (opinions, unrelated content, casual commentary)

Output ONLY the final JSON array (no reasoning in output):
[{"tweet_id": <id>, "pred": "humanitarian" or "not_humanitarian"}]`;
}

/**
 * Applies the selected prompting technique to the user's prompt
 */
function enhancePrompt(userPrompt, technique = 'zero-shot') {
  switch (technique) {
    case 'few-shot':
      return applyFewShot(userPrompt);
    case 'chain-of-thought':
      return applyChainOfThought(userPrompt);
    case 'structured':
      return applyStructuredReasoning(userPrompt);
    case 'zero-shot':
    default:
      return applyZeroShot(userPrompt);
  }
}

/**
 * Gets available prompting techniques with descriptions
 */
function getAvailableTechniques() {
  return [
    {
      id: 'zero-shot',
      name: 'Zero-Shot',
      description: 'Direct classification with clear role and output format',
      bestFor: 'Simple, clear prompts with well-defined categories'
    },
    {
      id: 'few-shot',
      name: 'Few-Shot Learning',
      description: 'Includes labeled examples to guide the model',
      bestFor: 'When you want to show the model what good classifications look like'
    },
    {
      id: 'chain-of-thought',
      name: 'Chain-of-Thought',
      description: 'Asks model to reason step-by-step before classifying',
      bestFor: 'Complex classification requiring nuanced judgment'
    },
    {
      id: 'structured',
      name: 'Structured Reasoning',
      description: 'Breaks down classification into systematic evaluation steps',
      bestFor: 'Ensuring consistent, methodical classification approach'
    }
  ];
}

module.exports = {
  enhancePrompt,
  getAvailableTechniques,
  FEW_SHOT_EXAMPLES
};
