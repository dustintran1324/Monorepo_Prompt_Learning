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
 * Prepares user prompt for classification
 * Only adds minimal output format - NO technique enhancements
 * The user's prompt is their complete instruction to the LLM
 */
function prepareForClassification(userPrompt) {
  return `${userPrompt}

Output format: Return ONLY a JSON array with this structure:
[{"tweet_id": <id>, "pred": "<label>"}]

Do not include any other text, just the JSON array.`;
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
  prepareForClassification,
  getAvailableTechniques,
  FEW_SHOT_EXAMPLES
};
