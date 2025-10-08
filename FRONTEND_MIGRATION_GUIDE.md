# Frontend Migration Guide: Converting Backend to Full-Stack Monorepo

## Overview

This document provides comprehensive guidance for migrating the current Qualtrics backend into a full-stack monorepo with a React frontend. The backend is an interactive survey tool that helps users improve prompt-writing skills through iterative attempts with OpenAI integration.

## Current Backend Architecture Summary

### Core Components
- **Node.js/Express** backend with MongoDB integration
- **OpenAI GPT-4** for prompt simulation and feedback generation
- **Qualtrics integration** for survey workflows
- **Chat history system** maintaining conversation context across 3 attempts
- **Performance evaluation** against ground truth datasets

### Key Files & Structure
```
backend/
├── src/
│   ├── config/          # Database & OpenAI configurations
│   ├── models/          # MongoDB schemas (Attempt.js)
│   ├── routes/          # API endpoints (/api/attempts)
│   ├── services/        # Business logic (promptService.js, openaiService.js)
│   ├── middleware/      # Validation & error handling
│   └── app.js          # Express setup
├── server.js           # Application entry point
├── data/               # Sample datasets (binary_sample_small.json, etc.)
└── package.json        # Dependencies & scripts
```

### Dependencies
- **Core**: express@5.1.0, mongoose@8.16.3, openai@5.9.0
- **Utils**: cors@2.8.5, dotenv@17.2.0
- **Dev**: nodemon@3.1.10

### API Endpoints
- `POST /api/attempts` - Submit prompt attempt
- `GET /api/attempts/:userId` - Get user attempts  
- `GET /api/attempts/:userId/chat-history` - Get conversation history
- `GET /health` - Health check

## Frontend Requirements

### Core Functionality to Replicate
1. **Interactive Prompt Interface**
   - Multi-step prompt submission form (3 attempts max)
   - Real-time feedback display with markdown parsing
   - Progress indicators during AI processing
   - Dataset preview tables (binary/multiclass examples)

2. **User Experience Features**
   - UID generation and persistence across sessions
   - Expandable/collapsible feedback sections
   - Comparison tables showing predictions vs ground truth
   - Loading states with descriptive progress messages

3. **Data Management**
   - Client-side state management for attempt history
   - Local storage for UID persistence
   - API integration matching existing backend endpoints

### Recommended Tech Stack

#### Frontend Framework
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0"
}
```

#### State Management
```json
{
  "zustand": "^4.0.0"
}
```
*Simple, lightweight alternative to Redux - perfect for this use case*

#### UI Components & Styling
```json
{
  "@radix-ui/react-select": "^1.0.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "tailwindcss": "^3.0.0",
  "clsx": "^1.2.0",
  "lucide-react": "^0.200.0"
}
```

#### Form Handling
```json
{
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.0.0"
}
```

#### Markdown & Data Display
```json
{
  "react-markdown": "^8.0.0",
  "react-table": "^7.8.0"
}
```

#### HTTP Client
```json
{
  "axios": "^1.0.0"
}
```

#### Development Tools
```json
{
  "vite": "^4.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  "typescript": "^5.0.0",
  "@types/react": "^18.0.0",
  "eslint": "^8.0.0",
  "prettier": "^2.8.0"
}
```

## Frontend Architecture Design

### Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── forms/           # Prompt submission forms
│   │   ├── display/         # Result & feedback displays
│   │   └── layout/          # Navigation & layout components
│   ├── pages/
│   │   ├── Home.tsx         # Landing page
│   │   ├── Survey.tsx       # Main survey interface
│   │   └── Results.tsx      # Results dashboard
│   ├── hooks/
│   │   ├── useAttempts.ts   # Attempt management
│   │   ├── useApi.ts        # API integration
│   │   └── useLocalStorage.ts # UID persistence
│   ├── store/
│   │   ├── attemptStore.ts  # Global state management
│   │   └── userStore.ts     # User session state
│   ├── services/
│   │   ├── api.ts           # API client configuration
│   │   └── validation.ts    # Form validation schemas
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   ├── utils/
│   │   ├── markdown.ts      # Markdown parsing utilities
│   │   ├── progress.ts      # Progress tracking
│   │   └── uid.ts           # UID generation logic
│   └── constants/
│       └── datasets.ts      # Sample data for display
├── public/
├── package.json
└── vite.config.ts
```

### Key Component Patterns

#### 1. Attempt Store (Zustand)
```typescript
interface AttemptStore {
  currentUser: string | null
  attempts: Attempt[]
  isLoading: boolean
  
  // Actions
  setUser: (uid: string) => void
  submitAttempt: (prompt: string, attempt: number) => Promise<void>
  fetchUserAttempts: (userId: string) => Promise<void>
  reset: () => void
}
```

#### 2. API Service Layer
```typescript
class ApiService {
  private baseUrl: string
  
  async submitAttempt(data: AttemptRequest): Promise<AttemptResponse>
  async getUserAttempts(userId: string): Promise<Attempt[]>
  async getChatHistory(userId: string): Promise<ChatMessage[]>
}
```

#### 3. Progress Component
```typescript
interface ProgressProps {
  isActive: boolean
  onComplete: () => void
}

const ProgressIndicator: React.FC<ProgressProps> = ({ isActive, onComplete }) => {
  // Implement progress steps matching backend processing stages
}
```

### State Management Strategy

#### UID Management
```typescript
// utils/uid.ts
export const generateUID = (): string => {
  return window.crypto?.randomUUID?.() || 
    `uid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const persistUID = (uid: string): void => {
  localStorage.setItem('survey_uid', uid)
}

export const getPersistedUID = (): string | null => {
  return localStorage.getItem('survey_uid')
}
```

#### Attempt History
```typescript
// store/attemptStore.ts
import { create } from 'zustand'

interface AttemptState {
  attempts: Map<number, AttemptData>
  currentAttempt: number
  chatHistory: ChatMessage[]
}

export const useAttemptStore = create<AttemptState>((set, get) => ({
  // State management logic matching backend's chat history system
}))
```

### Component Implementation Guide

#### 1. Main Survey Interface
```typescript
// pages/Survey.tsx
export const Survey: React.FC = () => {
  const { user, attempts, submitAttempt } = useAttemptStore()
  const [currentStep, setCurrentStep] = useState(1)
  
  return (
    <div className="survey-container">
      <TaskInstructions taskType="binary" />
      <DatasetPreview />
      <PromptForm 
        attemptNumber={currentStep}
        onSubmit={submitAttempt}
      />
      <ProgressIndicator />
      <ResultsDisplay />
    </div>
  )
}
```

#### 2. Prompt Submission Form
```typescript
// components/forms/PromptForm.tsx
interface PromptFormProps {
  attemptNumber: number
  onSubmit: (prompt: string) => Promise<void>
}

export const PromptForm: React.FC<PromptFormProps> = ({ attemptNumber, onSubmit }) => {
  const { register, handleSubmit, formState } = useForm<{prompt: string}>({
    resolver: zodResolver(promptSchema)
  })
  
  // Form implementation with validation and loading states
}
```

#### 3. Results & Feedback Display
```typescript
// components/display/ResultsDisplay.tsx
export const ResultsDisplay: React.FC = () => {
  const { currentAttempt } = useAttemptStore()
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="results-container">
      <PerformanceMetrics />
      <FeedbackSection 
        feedback={currentAttempt?.feedback}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
      <PredictionTable predictions={currentAttempt?.predictions} />
    </div>
  )
}
```

## Conversion Strategy

### Phase 1: Project Setup
1. **Initialize React/Vite project** in monorepo structure
2. **Configure TypeScript** with strict settings
3. **Set up Tailwind CSS** and component library
4. **Install dependencies** and configure build tools

### Phase 2: Core Infrastructure
1. **Create API service layer** matching backend endpoints
2. **Implement state management** with Zustand
3. **Set up routing** for multi-page navigation
4. **Configure environment variables** for backend URL

### Phase 3: UI Components
1. **Build reusable UI components** (buttons, forms, tables)
2. **Create layout components** (header, navigation, footer)
3. **Implement loading states** and progress indicators
4. **Design responsive layouts** for mobile/desktop

### Phase 4: Business Logic
1. **UID generation and persistence** matching Qualtrics logic
2. **Form validation** with error handling
3. **API integration** with proper error boundaries
4. **Chat history management** replicating backend flow

### Phase 5: Advanced Features
1. **Markdown rendering** for feedback display
2. **Data visualization** for performance metrics
3. **Export functionality** for results
4. **Accessibility improvements**

### Phase 6: Integration & Testing
1. **End-to-end testing** with existing backend
2. **Performance optimization** and code splitting
3. **Error handling** and user feedback
4. **Documentation** for deployment

## Data Flow Architecture

### Frontend ↔ Backend Communication
```typescript
// API Request Flow
User Input → Form Validation → API Service → Backend Processing → State Update → UI Refresh

// State Synchronization
Local Storage UID ↔ Zustand Store ↔ Backend Database
```

### Key Data Structures
```typescript
interface Attempt {
  userId: string
  attempt: number
  prompt: string
  llmOutput?: string
  feedback?: string
  predictions?: Prediction[]
  metadata: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    processingTimeMs: number
  }
  createdAt: Date
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Prediction {
  tweet_id: string
  tweet_text: string
  class_label: string
  predicted_label: string
}
```

## Deployment Considerations

### Environment Configuration
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_TITLE=Qualtrics Prompt Learning Tool
VITE_MAX_ATTEMPTS=3
```

### Build Configuration
```javascript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000' // Proxy to backend during development
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

## Migration Checklist

### Backend Compatibility
- [ ] Verify all API endpoints are accessible
- [ ] Test CORS configuration for frontend domain
- [ ] Confirm response formats match expected schemas
- [ ] Validate error handling for edge cases

### Frontend Functionality
- [ ] UID generation and persistence works correctly
- [ ] All 3 attempts can be submitted and stored
- [ ] Chat history builds correctly across attempts
- [ ] Feedback displays properly with markdown
- [ ] Progress indicators match backend processing times
- [ ] Prediction tables render correctly
- [ ] Mobile responsiveness is maintained

### Performance
- [ ] Bundle size is optimized
- [ ] API calls are properly cached
- [ ] Loading states provide good UX
- [ ] Error boundaries prevent crashes

### Integration
- [ ] Environment variables configured
- [ ] Deployment pipeline established
- [ ] Monitoring and logging in place
- [ ] Documentation updated

This guide provides the foundation for converting your Qualtrics backend into a modern, full-stack React application while maintaining all existing functionality and improving the user experience.