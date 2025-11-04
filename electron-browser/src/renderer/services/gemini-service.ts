import { streamWithComputerUse } from './computer-use-service';
import type { Message, Settings } from '../types';
import { SYSTEM_PROMPTS } from '../../constants/systemPrompts';

/**
 * Stream responses from Gemini
 * - Web mode: Uses Gemini 2.5 Computer Use via IPC
 * - Chat mode: Uses standard Gemini API
 */
export async function streamWithGemini(
  userInput: string,
  conversationHistory: Message[],
  settings: Settings,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
  mode: 'chat' | 'web' = 'chat'
): Promise<void> {
  if (!settings.googleApiKey) {
    throw new Error('Google API key is required');
  }

  // Web mode: use Gemini 2.5 Computer Use via IPC
  if (mode === 'web') {
    return new Promise((resolve, reject) => {
      let isAborted = false;

      const handleAbort = () => {
        isAborted = true;
        // Resolve instead of reject so it doesn't show error message
        resolve();
      };

      signal.addEventListener('abort', handleAbort);

      // FIXED: Include all valid conversation history, not just web mode
      // This preserves context from previous chat mode messages
      const filteredHistory = conversationHistory
        .filter((msg) => msg.content && msg.content.trim())
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      streamWithComputerUse(
        userInput,
        filteredHistory,
        settings.googleApiKey,
        (chunk: any) => {
          // Don't process chunks if aborted
          if (isAborted) return;

          // Only stream the AI model's actual text responses
          // Tool execution details (action/result) are handled silently in the backend
          if (chunk.type === 'text' && chunk.content) {
            // Only show text that doesn't contain tool execution markers
            if (!chunk.content.includes('[Executing:')) {
              onChunk(chunk.content);
            }
          }
        },
        () => {
          signal.removeEventListener('abort', handleAbort);
          if (!isAborted) {
            resolve();
          }
        },
        (error: string) => {
          signal.removeEventListener('abort', handleAbort);
          if (!isAborted) {
            reject(new Error(error));
          }
        }
      ).catch((err) => {
        if (!isAborted) {
          reject(err);
        }
      });
    });
  }

  // Chat mode: standard Gemini API with tool router support
  const geminiMessages = conversationHistory
    .filter((msg) => msg.mode === 'chat')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

  geminiMessages.push({
    role: 'user',
    parts: [{ text: userInput }],
  });

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent`;

  const requestBody: Record<string, unknown> = {
    contents: geminiMessages,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPTS.CHAT }] },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(`${apiUrl}?key=${settings.googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        onChunk(part.text);
      }
    }
  }
}
