// Shared types for the extension

export type ToolMode = 'tool-router';

export interface Settings {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  model: string;
  toolMode?: ToolMode;
  composioApiKey?: string;
}

export interface PageContext {
  url: string;
  title: string;
  textContent: string;
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
  forms: Array<{
    id: string;
    action: string;
    inputs: Array<{ name: string; type: string }>
  }>;
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
  };
}

export interface BrowserMemory {
  recentPages: Array<{
    url: string;
    title: string;
    timestamp: number;
    context?: any
  }>;
  userPreferences: Record<string, any>;
  sessionData: Record<string, any>;
}

export interface MessageRequest {
  type: string;
  [key: string]: any;
}

export interface MessageResponse {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
}
