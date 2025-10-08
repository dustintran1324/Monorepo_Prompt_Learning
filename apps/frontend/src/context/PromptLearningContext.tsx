import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { PromptLearningState, AttemptData } from '../types';
import { generateUserId, saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ATTEMPTS'; payload: AttemptData[] }
  | { type: 'ADD_ATTEMPT'; payload: AttemptData }
  | { type: 'SET_CURRENT_ATTEMPT'; payload: number }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_STREAMING_CONTENT'; payload: string }
  | { type: 'APPEND_STREAMING_CONTENT'; payload: string }
  | { type: 'SET_USER_ID'; payload: string }
  | { type: 'RESET_STATE' };

const initialState: PromptLearningState = {
  userId: '',
  currentAttempt: 1,
  attempts: [],
  isLoading: false,
  error: null,
  isStreaming: false,
  streamingContent: ''
};

function promptLearningReducer(state: PromptLearningState, action: Action): PromptLearningState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_ATTEMPTS':
      return { ...state, attempts: action.payload };
    case 'ADD_ATTEMPT':
      return {
        ...state,
        attempts: [...state.attempts.filter(a => a.attempt !== action.payload.attempt), action.payload]
        // Don't auto-increment currentAttempt - wait for user to click "Next Attempt"
      };
    case 'SET_CURRENT_ATTEMPT':
      return { ...state, currentAttempt: action.payload };
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload };
    case 'SET_STREAMING_CONTENT':
      return { ...state, streamingContent: action.payload };
    case 'APPEND_STREAMING_CONTENT':
      return { ...state, streamingContent: state.streamingContent + action.payload };
    case 'RESET_STATE':
      return { ...initialState, userId: state.userId };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    default:
      return state;
  }
}

interface PromptLearningContextType {
  state: PromptLearningState;
  dispatch: React.Dispatch<Action>;
  resetProgress: () => void;
}

const PromptLearningContext = createContext<PromptLearningContextType | undefined>(undefined);

export function PromptLearningProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(promptLearningReducer, initialState);

  useEffect(() => {
    const savedUserId = loadFromLocalStorage<string>('promptLearning_userId');
    const savedAttempts = loadFromLocalStorage<AttemptData[]>('promptLearning_attempts');
    const savedCurrentAttempt = loadFromLocalStorage<number>('promptLearning_currentAttempt');

    const userId = savedUserId || generateUserId();
    
    dispatch({ type: 'SET_USER_ID', payload: userId });
    dispatch({ type: 'SET_ATTEMPTS', payload: savedAttempts || [] });
    dispatch({ type: 'SET_CURRENT_ATTEMPT', payload: savedCurrentAttempt || 1 });
    
    if (!savedUserId) {
      saveToLocalStorage('promptLearning_userId', userId);
    }
  }, []);

  useEffect(() => {
    if (state.userId) {
      saveToLocalStorage('promptLearning_userId', state.userId);
    }
  }, [state.userId]);

  useEffect(() => {
    if (state.attempts.length > 0) {
      saveToLocalStorage('promptLearning_attempts', state.attempts);
    }
  }, [state.attempts]);

  useEffect(() => {
    saveToLocalStorage('promptLearning_currentAttempt', state.currentAttempt);
  }, [state.currentAttempt]);

  const resetProgress = () => {
    dispatch({ type: 'RESET_STATE' });
    localStorage.removeItem('promptLearning_attempts');
    localStorage.removeItem('promptLearning_currentAttempt');
    const newUserId = generateUserId();
    saveToLocalStorage('promptLearning_userId', newUserId);
  };

  return (
    <PromptLearningContext.Provider value={{ state, dispatch, resetProgress }}>
      {children}
    </PromptLearningContext.Provider>
  );
}

export function usePromptLearning() {
  const context = useContext(PromptLearningContext);
  if (context === undefined) {
    throw new Error('usePromptLearning must be used within a PromptLearningProvider');
  }
  return context;
}