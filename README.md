## Project Overview

This is a **Prompt Learning Plugin** - an interactive educational tool that helps researchers improve their AI prompt-writing skills for disaster/humanitarian tweet classification tasks. It serves as a training environment for a larger research application that mines and labels X/Twitter data for NLP training.

### Parent Application Context
This plugin supports an existing research tool that:
- Mines X/Twitter data based on keyword searching and topics (e.g., Hurricane Irma disaster tweets)
- Presents mined data to researchers for manual NLP labeling
- Recently added an AI-powered auto-labeler feature
- **Problem**: Researchers struggle to write effective prompts, limiting AI labeler effectiveness

### Dataset Types
The system works with real disaster/humanitarian response tweets:

**Binary Classification:**
- `humanitarian` vs `not_humanitarian`

**Multiclass Classification (9 categories):**
- `requests_or_urgent_needs` - Calls for help, resources needed
- `caution_and_advice` - Safety warnings, evacuation notices
- `displaced_people_and_evacuations` - Shelter info, evacuation status
- `infrastructure_and_utility_damage` - Power outages, building damage
- `injured_or_dead_people` - Casualties, medical emergencies
- `rescue_volunteering_or_donation_effort` - Relief efforts, donations
- `sympathy_and_support` - Prayers, emotional support
- `other_relevant_information` - General disaster-related info
- `not_humanitarian` - Off-topic or irrelevant tweets

**Example Data:** See `apps/backend/data/binary_sample_small.json` and `apps/backend/data/multiclass_test_small.json`

### How It Works
1. **Researcher views sample dataset** with real disaster tweets (from Hurricane Irma data)
2. **Researcher writes a classification prompt** attempting to create effective instructions
3. **Backend simulates** running the prompt on the dataset using OpenAI GPT
4. **Backend evaluates** predictions against ground truth labels with metrics (accuracy, precision, recall, F1)
5. **AI generates feedback** with specific improvement suggestions based on performance
6. **Chat history builds** across all 3 attempts to provide contextual, progressive feedback
7. **Results stored** in MongoDB for analysis and research
8. **Skills transfer** - Researcher applies learned techniques to main labeling tool

---

## Architecture Overview

### Monorepo Structure
```
Monorepo_Prompt_Learning/
├── apps/
│   ├── backend/              # Express.js API + MongoDB + OpenAI
│   │   ├── data/             # Real disaster tweet datasets
│   │   │   ├── binary_sample_small.json
│   │   │   └── multiclass_test_small.json
│   │   ├── src/
│   │   │   ├── config/       # Database and OpenAI configurations
│   │   │   ├── models/       # MongoDB schemas (Attempt)
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic (OpenAI, evaluation)
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── middleware/   # Validation and error handling
│   │   │   └── app.js        # Express setup
│   │   ├── server.js         # Application entry point
│   │   └── .env              # Environment variables
│   │
│   └── frontend/             # React + TypeScript + Vite
│       ├── src/
│       │   ├── components/   # PromptLearningPlugin (main UI)
│       │   ├── context/      # State management (Context API)
│       │   ├── services/     # API client (Axios)
│       │   ├── types/        # TypeScript interfaces
│       │   ├── styles/       # CSS modules
│       │   ├── utils/        # Local storage helpers
│       │   └── hooks/        # Custom React hooks
│       └── vite.config.ts    # Vite configuration
│
├── packages/                 # Shared utilities (future)
├── shared/                   # Shared code (future)
└── package.json              # Workspace configuration
```

### Tech Stack
**Backend:**
- Node.js + Express.js
- MongoDB (Mongoose) - stores attempts, chat history, metrics
- OpenAI API (GPT-4) - prompt simulation & feedback generation
- express-validator - input validation

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Axios (API client)
- Context API (state management)
- CSS Modules (styling)
---
### 🔧 **Configuration Files**

#### `src/config/database.js`
- **Purpose**: Establishes MongoDB connection
- **Key Function**: `connectDB()` - Handles connection with error handling
- **Dependencies**: Uses `MONGODB_URI` from environment variables

#### `src/config/openai.js`
- **Purpose**: Configures OpenAI client
- **Exports**: Initialized OpenAI instance with API key
- **Usage**: Imported by services that need GPT access

### **Data Models**

#### `src/models/Attempt.js`
- **Purpose**: Defines MongoDB schema for user attempts
- **Key Fields**:
  - `userId`: Unique identifier for each participant
  - `attempt`: Number (1-3) indicating which attempt this is
  - `prompt`: The user's submitted prompt text
  - `llmOutput`: Simulated result from running prompt on dataset
  - `feedback`: AI-generated evaluation and improvement suggestions
  - `chatHistory`: Array of conversation messages in OpenAI format
  - `metadata`: Token usage, processing time, model info
- **Indexes**: Compound unique index on `userId + attempt` prevents duplicates

### **Middleware**

#### `src/middleware/errorHandler.js`
- **Purpose**: Global error handling for the Express app
- **Features**:
  - Catches validation errors and returns structured responses
  - Handles MongoDB cast errors (invalid IDs)
  - Provides consistent error format across all endpoints
  - Logs errors for debugging

#### `src/middleware/validation.js`
- **Purpose**: Input validation for API requests
- **Key Function**: `validatePromptSubmission()`
  - Validates `userId` (required string)
  - Validates `prompt` (required non-empty string)
  - Validates `attempt` (number between 1-3)
  - Returns structured error messages for invalid inputs

### **API Routes**

#### `src/routes/attempts.js`
- **Purpose**: Defines all API endpoints for prompt attempts
- **Endpoints**:
  - `POST /api/attempts` - Submit new prompt attempt
  - `GET /api/attempts/:userId` - Get all attempts for a user
  - `GET /api/attempts/:userId/chat-history` - Get conversation history
- **Features**:
  - Duplicate attempt prevention
  - Input validation integration
  - Structured error responses

### **Business Logic Services**

#### `src/services/openaiService.js` ⚠️ **CUSTOMIZE THIS**
- **Purpose**: Handles all OpenAI GPT interactions
- **Key Methods**:
  - `simulatePromptOnDataset()`: Simulates running user prompt on data
  - `evaluateAndProvideFeedback()`: Generates improvement feedback
- **⚠️ IMPORTANT**: Contains placeholder prompts that need customization
- **TODO for teammate**: Replace all `// PLACEHOLDER` comments with actual:
  - System prompts for your specific dataset/task
  - Evaluation criteria and ground truth comparisons
  - Feedback formatting and tone guidelines

#### `src/services/promptService.js`
- **Purpose**: Orchestrates the full prompt processing workflow
- **Key Method**: `processPromptAttempt()`
  1. Retrieves user's previous attempts from database
  2. Builds cumulative chat history
  3. Calls OpenAI service for simulation and evaluation
  4. Saves complete attempt record to MongoDB
  5. Returns formatted response to frontend
- **Additional Methods**:
  - `getUserAttempts()`: Retrieves all attempts without chat history
  - `getUserChatHistory()`: Gets full conversation history

### **Application Setup**

#### `src/app.js`
- **Purpose**: Express application configuration
- **Setup includes**:
  - CORS configuration (customizable for Qualtrics domains)
  - JSON body parsing with size limits
  - Route mounting
  - Global error handling
  - Health check endpoint

#### `server.js`
- **Purpose**: Application entry point
- **Features**:
  - Environment variable loading
  - Server startup with port configuration
  - Graceful shutdown handling (SIGTERM/SIGINT)
  - Development-friendly logging

---

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables
```env
PORT=3000                                    # Server port
MONGODB_URI=mongodb://localhost:27017/...    # Database cluster connection (I'll get the cluster key soon)
OPENAI_API_KEY=sk-...                       # OpenAI API key
NODE_ENV=development                         # Environment mode
```

### Running the Application
```bash
# Run both frontend and backend concurrently
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Build both apps
npm run build

# Production mode (backend)
npm start
```

### Health Check
- Backend: `http://localhost:3000/health`
- Frontend: `http://localhost:5173` (default Vite port)

---

## API Documentation

### Submit Prompt Attempt
```http
POST /api/attempts
Content-Type: application/json

{
  "userId": "user123",
  "prompt": "Classify the following tweet as wildfire-related or not...",
  "attempt": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attempt": 1,
    "llmOutput": "Based on your prompt, here's how it performed...",
    "feedback": "Your prompt shows good structure. Consider adding...",
    "metadata": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350,
      "processingTimeMs": 2500
    }
  }
}
```

### Get User Attempts
```http
GET /api/attempts/user123
```

### Get Chat History
```http
GET /api/attempts/user123/chat-history
```

---
## Database Schema

### Attempt Document
```javascript
{
  _id: ObjectId,
  userId: "user123",
  attempt: 1,
  prompt: "User's prompt text...",
  llmOutput: "Simulated results...",
  feedback: "AI-generated feedback...",
  chatHistory: [
    {
      role: "user",
      content: "Prompt text...",
      timestamp: ISODate
    },
    {
      role: "assistant", 
      content: "Response...",
      timestamp: ISODate
    }
  ],
  metadata: {
    promptTokens: 150,
    completionTokens: 200,
    totalTokens: 350,
    model: "gpt-4o-mini",
    processingTimeMs: 2500
  },
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

## Development Tips

### Testing Endpoints
```bash
# Test health check
curl http://localhost:3000/health

# Test prompt submission
curl -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","prompt":"Test prompt","attempt":1}'
```

---

## Integration with Parent Application

### Plugin Embedding Strategy
- Plugin designed as standalone React component (`<PromptLearningPlugin />`)
- Can be embedded into existing Twitter labeling UI as modal/overlay
- Isolated state management (doesn't interfere with parent app)
- Optional `onClose` prop for parent app control
- Provides learning environment before researchers use main AI labeler

### Current Status
✅ **Completed:**
- Full backend API with OpenAI integration
- Complete frontend UI with performance metrics dashboard
- Real disaster tweet datasets loaded (binary & multiclass)
- State management with Context API
- Local storage persistence
- Backend health monitoring

📍 **In Progress:**
- Syncing frontend sample dataset with real disaster tweets
- Task type selection UI (binary vs multiclass)
- Plugin embedding into parent application

## Future Enhancements

### Extensibility Features Built In
- **Flexible attempt count**: Easy to extend beyond 3 attempts
- **Modular prompt service**: Easy to add new evaluation methods
- **Comprehensive metadata**: Ready for detailed analytics
- **Chat history preservation**: Supports complex conversation flows
- **Multiple task types**: Binary and multiclass classification support

### Suggested Improvements
- Add task type selector in UI (binary vs multiclass)
- Show real-time prediction examples during evaluation
- Add comparison view across all 3 attempts
- Export learning progress reports
- Add Redis caching for frequently accessed data
- Implement WebSocket for real-time feedback streaming
- Add comprehensive test suite
- Create admin dashboard for monitoring researcher progress

---

### Getting Help
- Check server logs: `npm run dev`
- Verify environment variables are loaded
- Test individual API endpoints with curl or Postman
- Monitor MongoDB for data persistence issues

