export enum FieldType {
  MONEY = 'MONEY',
  PERCENTAGE = 'PERCENTAGE',
  YEAR = 'YEAR',
  QUARTER = 'QUARTER',  
  MONTH = 'MONTH',
  DATE = 'DATE',
  NUMERIC = 'NUMERIC',
  TEXT = 'TEXT',
}

export interface ColumnMetadata {
  name: string;
  type: FieldType;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  responseData?: ChatResponse; // Store full response for clickable messages
}

export interface ChatResponse {
  answer: string;
  data: any[];
  columns?: ColumnMetadata[];
  suggestedQuestions: string[];
  clarifyingQuestion?: string;
  pipeline?: any[];
}

interface ApiResponse {
  status?: 'error' | 'success';
  error?: string;
  answer?: string;
  data?: any[];
  columns?: ColumnMetadata[];
  suggestedQuestions?: string[];
  clarifyingQuestion?: string;
  pipeline?: any[];
}

interface ApiHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ApiRequest {
  message: string;
  history: ApiHistoryMessage[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';



export async function sendChat(
  message: string,
  history: ChatMessage[],
  abortSignal?: AbortSignal
): Promise<ChatResponse> {
  try {
    // Convert ChatMessage[] to API history format (only user and assistant, no system)
    // Take last 5 messages as per API spec
    const apiHistory: ApiHistoryMessage[] = history
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-5)
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    const requestBody: ApiRequest = {
      message,
      history: apiHistory
    };

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    // Check if API returned an error status
    if (data.status === 'error') {
      throw new Error('Failed to process your request. Please try again.');
    }

    // Handle clarifying question as answer if no answer provided
    if (data.clarifyingQuestion && !data.answer) {
      data.answer = data.clarifyingQuestion;
    }

    // Return the full response including pipeline
    return {
      answer: data.answer || 'No response received',
      data: data.data || [],
      columns: data.columns || [],
      suggestedQuestions: data.suggestedQuestions || [],
      clarifyingQuestion: data.clarifyingQuestion,
      pipeline: data.pipeline
    };
  } catch (error) {
    // Handle abort errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request cancelled');
    }
    
    console.error('Chat API error:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to communicate with the analytics server'
    );
  }
}