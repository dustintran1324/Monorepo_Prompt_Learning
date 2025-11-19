# SMIDGen Prompt Training

An interactive tool for training researchers to write effective AI prompts for text classification. Users practice writing prompts across 3 attempts, receive performance metrics and AI feedback, then apply learned skills to production labeling tasks.

## Current Features

- **Interactive Prompt Training**: Write and refine prompts across 3 attempts with iterative feedback
- **Real-time Classification**: GPT-4o-mini evaluates prompts against labeled datasets
- **Performance Metrics**: Accuracy, precision, recall, and F1 scores after each attempt
- **AI Coaching**: Context-aware feedback that references previous attempts
- **Custom Datasets**: Upload CSV files with your own text and labels
- **Dynamic Label Support**: Automatically detects and color-codes unique labels
- **Multiple Feedback Modes**: Zero-shot, few-shot, chain-of-thought, and structured coaching styles

## Tech Stack

**Backend**: Node.js, Express, MongoDB (Mongoose), OpenAI GPT-4o-mini
**Frontend**: React 19, TypeScript, Vite, Context API

## Project Structure

```
apps/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and OpenAI setup
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Validation, error handling
│   │   ├── models/         # MongoDB schemas (Attempt, Dataset)
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Business logic, OpenAI integration
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   ├── context/        # State management
    │   ├── services/       # API client
    │   └── styles/         # CSS modules
    └── vite.config.ts
```

## Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- OpenAI API key

### Installation

```bash
git clone https://github.com/yourusername/Monorepo_Prompt_Learning.git
cd Monorepo_Prompt_Learning
npm install
```

### Environment Variables

**Backend** (`apps/backend/.env`):
```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
MONGODB_URI=mongodb+srv://your-cluster-url
OPENAI_API_KEY=sk-your-key-here
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`apps/frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### Run Development

```bash
npm run dev          # Both frontend and backend
npm run dev:backend  # Backend only (http://localhost:3000)
npm run dev:frontend # Frontend only (http://localhost:5173)
```

## API Endpoints

### Attempts
- `POST /api/attempts/submit-sse` - Submit prompt with streaming feedback
- `GET /api/attempts/user/:userId` - Get user's attempts
- `GET /api/attempts/techniques` - Get available feedback techniques

### Dataset
- `POST /api/dataset/upload` - Upload custom CSV
- `GET /api/dataset/user/:userId` - Get user's dataset
- `DELETE /api/dataset/user/:userId` - Delete user's dataset

### Health
- `GET /health` - Backend health check

## CSV Format

Upload CSV files with these columns:

| Column | Alternative | Description |
|--------|-------------|-------------|
| `text` | `tweet_text` | Input text to classify |
| `label` | `class_label` | Ground truth label |
| `id` | `tweet_id` | Unique identifier |

```csv
id,text,label
1,"I love this product!",positive
2,"Terrible experience",negative
```

## Deployment

### Backend (Render)

1. Create Web Service on Render
2. Connect GitHub repository
3. Configure:
   - Root Directory: `/` (empty)
   - Build Command: `npm install`
   - Start Command: `npm run start`

4. Environment variables:
   - `PORT=10000`
   - `NODE_ENV=production`
   - `MONGODB_URI`, `OPENAI_API_KEY`
   - `FRONTEND_URL`, `CORS_ORIGIN` (your Cloudflare URL)

### Frontend (Cloudflare Pages)

1. Create Pages project
2. Connect GitHub repository
3. Build settings:
   - Build command: `npm install && npm run build:frontend`
   - Output directory: `apps/frontend/dist`

4. Environment variable:
   - `VITE_API_URL` (your Render backend URL)

## Known Limitations

### No User Authentication
Currently uses client-generated UUIDs for user identification. Data persists but users cannot:
- Access their data from different devices
- Manage multiple projects
- Share or collaborate on datasets

### Single Dataset Per User
Users can only have one active dataset at a time. Uploading a new CSV replaces the previous one.

### Hardcoded Default Dataset
The Hurricane Irma dataset and category descriptions are hardcoded. Custom datasets show generic instructions but the underlying evaluation logic assumes binary classification patterns.

### No Data Export
Users cannot export their attempts, feedback history, or performance metrics.

### Limited Error Recovery
Failed API calls during classification don't have robust retry logic. Network issues can result in lost progress.

## Future Implementation

### User Authentication and Projects

**Planned Features**:
- OAuth 2.0 authentication (Google, GitHub)
- JWT-based session management
- User dashboard with project management
- Multiple datasets per user with project organization
- Progress persistence across devices

**Data Model Changes**:
```javascript
// New User model
{
  userId: String,
  email: String,
  projects: [{
    projectId: String,
    name: String,
    datasetId: String,
    attempts: [AttemptId]
  }]
}
```

**Implementation Approach**:
1. Add authentication middleware (Passport.js or Auth0)
2. Create User and Project models
3. Update existing endpoints to require authentication
4. Build project management UI (create, rename, delete, switch)
5. Add sharing and collaboration features

### Additional Planned Features

- **Data Export**: Download attempts and metrics as CSV/JSON
- **Prompt Templates**: Save and reuse effective prompts
- **Team Workspaces**: Share projects and datasets within organizations
- **Custom Evaluation Metrics**: Define task-specific success criteria
- **Batch Processing**: Evaluate prompts on larger datasets asynchronously
- **Version History**: Track prompt iterations with diff views

## Addressing Current Limitations

### For Authentication
Replace UUID-based identification with proper auth flow. Migrate existing data by associating UUIDs with authenticated user accounts during first login.

### For Multiple Datasets
Extend Dataset model to support multiple entries per user. Add project context to associate datasets with specific training sessions.

### For Default Dataset
Move default dataset to database seed or configuration file. Allow admins to define multiple default datasets for different task types.

### For Error Handling
Implement retry logic with exponential backoff. Add request queuing for resilience. Store partial results to enable recovery from failures.

## Development Notes

### Testing
```bash
# Health check
curl http://localhost:3000/health

# Test submission
curl -X POST http://localhost:3000/api/attempts/submit \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","prompt":"Classify as positive or negative","attemptNumber":1,"taskType":"binary"}'
```

### Common Issues

**CORS errors**: Verify `FRONTEND_URL` and `CORS_ORIGIN` match your frontend domain exactly.

**MongoDB connection fails**: Check `MONGODB_URI` and ensure your IP is whitelisted in Atlas.

**OpenAI timeout**: Large datasets may exceed default timeouts. Frontend has 120s limit for SSE connections.

## License

MIT
