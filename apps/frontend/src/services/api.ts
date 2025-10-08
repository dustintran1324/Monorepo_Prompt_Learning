import axios from 'axios';
import type { ApiResponse, AttemptData, SubmissionData, ChatMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

export { api };