# Prompt Learning Plugin

An interactive tool for training researchers to write better AI prompts for disaster tweet classification. Users practice writing prompts across 3 attempts, receive performance metrics and AI feedback, then apply learned skills to production labeling tasks.

## What It Does

1. Show sample disaster tweets with ground truth labels
2. User writes a classification prompt for GPT-4o-mini
3. Backend runs the prompt on 100 real Hurricane Irma tweets
4. Calculate metrics (accuracy, precision, recall, F1)
5. GPT provides contextual feedback comparing with previous attempts
6. User iterates across 3 attempts to improve prompting skills

## Setup

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas cluster)
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your MongoDB URI and OpenAI API key
```

### Environment Variables

Edit `apps/backend/.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://your-cluster-url
OPENAI_API_KEY=sk-your-key-here
FRONTEND_URL=http://localhost:5173
```

### Run the Application

```bash
# Run both frontend and backend
npm run dev

# Run separately
npm run dev:backend  # http://localhost:3000
npm run dev:frontend # http://localhost:5173
```

## Project Structure

```
apps/
├── backend/
│   ├── data/                          # Ground truth datasets
│   │   ├── binary_sample_small.json   # 100 Hurricane Irma tweets
│   │   └── multiclass_test_small.json
│   ├── src/
│   │   ├── config/                    # DB and OpenAI setup
│   │   ├── models/Attempt.js          # MongoDB schema
│   │   ├── routes/attempts.js         # API endpoints
│   │   ├── controllers/               # Request handlers
│   │   ├── services/
│   │   │   ├── openaiService.js       # GPT integration, evaluation
│   │   │   └── promptService.js       # Main business logic
│   │   └── middleware/                # Validation, error handling
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/PromptLearningPlugin.tsx  # Main UI
    │   ├── context/PromptLearningContext.tsx    # State management
    │   ├── services/api.ts                      # Backend API client
    │   └── styles/PluginWindow.module.css
    └── vite.config.ts
```

## Tech Stack

**Backend**: Node.js, Express, MongoDB (Mongoose), OpenAI GPT-4o-mini
**Frontend**: React 19, TypeScript, Vite, Context API, ReactMarkdown

## Classification Categories

### Binary Classification
- `humanitarian` - Evacuation orders, rescue requests, damage reports, safety warnings
- `not_humanitarian` - Opinions, off-topic commentary, unrelated content

### Multiclass Classification (9 categories)
- `requests_or_urgent_needs`
- `caution_and_advice`
- `displaced_people_and_evacuations`
- `infrastructure_and_utility_damage`
- `injured_or_dead_people`
- `rescue_volunteering_or_donation_effort`
- `sympathy_and_support`
- `other_relevant_information`
- `not_humanitarian`

## API Endpoints

### Submit Attempt
```http
POST /api/attempts
Content-Type: application/json

{
  "userId": "user123",
  "prompt": "Classify the following tweets...",
  "attemptNumber": 1,
  "taskType": "binary"
}
```

### Get User Attempts
```http
GET /api/attempts/:userId
```

### Health Check
```http
GET /health
```

## Database Schema

```javascript
{
  userId: String,
  attempt: Number,              // 1-3
  prompt: String,               // User's classification prompt
  llmOutput: String,            // Raw GPT predictions
  feedback: String,             // AI-generated improvement suggestions
  chatHistory: [                // OpenAI message format
    { role: "user", content: "...", timestamp: Date },
    { role: "assistant", content: "...", timestamp: Date }
  ],
  metrics: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number
  },
  metadata: {
    model: String,
    promptTokens: Number,
    completionTokens: Number,
    processingTimeMs: Number
  }
}
```

## Future Implementations

### CSV Upload Feature
Allow users to upload custom datasets for training:

- Add file upload component in frontend (drag-and-drop)
- Backend endpoint: `POST /api/datasets/upload`
- Validate CSV format (required columns: `text`, `label`, `id`)
- Store uploaded datasets per user in MongoDB GridFS
- Update evaluation logic to use user's dataset instead of default
- Add dataset management UI (view, delete, select active dataset)

**Technical considerations:**
- Max file size: 5MB (configurable)
- CSV parsing with `csv-parser` library
- Validate label consistency with task type
- Store dataset reference in Attempt schema
- Allow switching between default and custom datasets

## Development

### Testing
```bash
# Test backend health
curl http://localhost:3000/health

# Test submission
curl -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","prompt":"Test","attemptNumber":1,"taskType":"binary"}'
```

### Common Issues

**Backend timeout**: Frontend has 120s timeout for GPT processing. If evaluation takes longer, check OpenAI API status.

**MongoDB connection fails**: Verify `MONGODB_URI` is correct and cluster IP whitelist includes your IP.

**CORS errors**: Update `FRONTEND_URL` in backend `.env` to match your frontend port.

## Integration

The frontend plugin is designed as a standalone component that can be embedded in larger applications:

```tsx
import { PromptLearningPlugin } from './components/PromptLearningPlugin';

function App() {
  return <PromptLearningPlugin onClose={() => handleClose()} />;
}
```

Use as a modal/overlay in existing research tools to provide prompt training before production labeling tasks.

Different prompt techniques, for each user that is using this. Record what is the suggestion they got. 