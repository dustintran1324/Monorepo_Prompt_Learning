## Project Overview

This backend powers an interactive survey tool that helps users improve their prompt-writing skills through 3 structured attempts. Users write prompts, receive AI-generated feedback, and iteratively refine their approach based on automated evaluation against ground truth data.

### How It Works
1. **User submits a prompt** via Qualtrics frontend
2. **Backend simulates** running the prompt on a dataset using OpenAI GPT
3. **Backend evaluates** the output against ground truth and generates feedback
4. **Chat history builds** across all 3 attempts to provide contextual feedback
5. **Results stored** in MongoDB for analysis and research

---

## Architecture Overview

```
backend/
├── src/
│   ├── config/          # Database and external service configurations
│   ├── models/          # MongoDB schemas and data models
│   ├── routes/          # API endpoint definitions
│   ├── services/        # Business logic and external integrations
│   ├── middleware/      # Request processing and validation
│   └── app.js          # Express application setup
├── server.js           # Application entry point
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```
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
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

### Health Check
Visit `http://localhost:3000/health` to verify the server is running.

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

## Future Enhancements

### Extensibility Features Built In
- **Flexible attempt count**: Easy to extend beyond 3 attempts
- **Modular prompt service**: Easy to add new evaluation methods
- **Comprehensive metadata**: Ready for detailed analytics
- **Chat history preservation**: Supports complex conversation flows

### Suggested Improvements
- Add Redis caching for frequently accessed data
- Implement WebSocket for real-time feedback
- Add comprehensive test suite
- Create admin dashboard for monitoring
- Implement user authentication system

---

### Getting Help
- Check server logs: `npm run dev`
- Verify environment variables are loaded
- Test individual API endpoints with curl or Postman
- Monitor MongoDB for data persistence issues

