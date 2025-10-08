export interface AttemptData {
  id: string;
  userId: string;
  attempt: number;
  prompt: string;
  feedback: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  predictions: {
    items: PredictionItem[];
  };
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionItem {
  id: number;
  text: string;
  predicted: string;
  actual: string;
  confidence: number;
  error?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface PromptLearningState {
  userId: string;
  currentAttempt: number;
  attempts: AttemptData[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
  streamingContent: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SubmissionData {
  userId: string;
  prompt: string;
  attemptNumber: number;
  taskType?: 'binary' | 'multiclass' | 'multilabel';
  technique?: 'zero-shot' | 'few-shot' | 'chain-of-thought' | 'structured';
}

export interface DatasetSample {
  text: string;
  label: string;
}