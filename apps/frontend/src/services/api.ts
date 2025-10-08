import axios from 'axios';
import type { ApiResponse, AttemptData, SubmissionData, ChatMessage, DatasetSample } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 2 minutes for large dataset evaluation
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export async function submitAttempt(data: SubmissionData): Promise<AttemptData> {
  try {
    const response = await api.post<ApiResponse<AttemptData>>('/api/attempts/submit', data);
    return response.data.data;
  } catch (error: any) {
    console.error('Submit attempt error:', error);
    throw new Error(error.response?.data?.error || 'Failed to submit attempt');
  }
}

export async function submitAttemptSSE(
  data: SubmissionData,
  onProgress: (message: string) => void
): Promise<AttemptData> {
  return new Promise((resolve, reject) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    fetch(`${API_BASE_URL}/api/attempts/submit-sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('SSE request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                onProgress(event.message || 'Processing...');
              } else if (event.type === 'complete') {
                resolve(event.data);
                return;
              } else if (event.type === 'error') {
                reject(new Error(event.message));
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    }).catch(reject);
  });
}

export async function getUserAttempts(userId: string): Promise<AttemptData[]> {
  try {
    const response = await api.get<ApiResponse<AttemptData[]>>(`/api/attempts/user/${userId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Get user attempts error:', error);
    throw new Error(error.response?.data?.error || 'Failed to get user attempts');
  }
}

export async function getChatHistory(userId: string, attemptNumber: number): Promise<ChatMessage[]> {
  try {
    const response = await api.get<ApiResponse<ChatMessage[]>>(
      `/api/attempts/user/${userId}/attempt/${attemptNumber}/chat`
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Get chat history error:', error);
    throw new Error(error.response?.data?.error || 'Failed to get chat history');
  }
}

export async function checkHealth(): Promise<any> {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error: any) {
    console.error('Health check error:', error);
    throw new Error(error.response?.data?.error || 'Failed to check API health');
  }
}

export interface PromptingTechnique {
  id: string;
  name: string;
  description: string;
  bestFor: string;
}

export async function getTechniques(): Promise<PromptingTechnique[]> {
  try {
    const response = await api.get<ApiResponse<PromptingTechnique[]>>('/api/attempts/techniques');
    return response.data.data;
  } catch (error: any) {
    console.error('Get techniques error:', error);
    throw new Error(error.response?.data?.error || 'Failed to get techniques');
  }
}

export async function uploadDataset(userId: string, file: File): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await api.post<ApiResponse<any>>('/api/dataset/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Upload dataset error:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload dataset');
  }
}

export async function getDataset(userId: string): Promise<DatasetSample[]> {
  try {
    const response = await api.get<ApiResponse<DatasetSample[]>>(`/api/dataset/user/${userId}`);
    return response.data.data;
  } catch (error: any) {
    // Return null if no custom dataset found
    if (error.response?.status === 404) {
      return [];
    }
    console.error('Get dataset error:', error);
    throw new Error(error.response?.data?.error || 'Failed to get dataset');
  }
}

export { api };