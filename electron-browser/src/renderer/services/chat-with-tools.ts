import type { Message, Settings } from '../types';

/**
 * Stream chat with Composio tools using AI SDK (via IPC to main process)
 * Uses Gemini LLM with Composio Tool Router MCP tools
 * Falls back to simple chat if tools aren't initialized
 */
export async function streamChatWithTools(
  userInput: string,
  conversationHistory: Message[],
  settings: Settings,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  if (!settings.googleApiKey) {
    throw new Error('Google API key is required');
  }

  try {
    // Build conversation history for AI SDK
    const messages = conversationHistory
      .filter((msg) => msg.mode === 'chat')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    console.log('[Chat] Streaming with Gemini via IPC...');

    // Note: Tools are retrieved in the main process, not passed through IPC
    // (they contain non-serializable functions and can't be cloned)

    // Call streamText via IPC (runs in main process where google() can access GOOGLE_GENERATIVE_AI_API_KEY)
    const result = await window.electronAPI.streamChatWithTools(
      userInput,
      messages,
      settings.model,
      settings.googleApiKey
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to stream chat');
    }

    // Process chunks received from main process
    for (const chunk of result.chunks || []) {
      if (signal.aborted) {
        break;
      }

      console.log('[Chat] Received chunk:', chunk);

      try {
        const chunkObj = JSON.parse(chunk);

        switch (chunkObj.type) {
          case 'text':
            onChunk(String(chunkObj.data));
            break;

          case 'tool-call':
            onChunk(`\n\n*Calling tool: ${chunkObj.toolName}*\n\n`);
            break;

          case 'tool-result':
            onChunk(`*Tool result: ${JSON.stringify(chunkObj.data)}*\n\n`);
            break;

          case 'error':
            console.error('[Chat] Stream error:', chunkObj.error);
            onChunk(`\n\n**Error:** ${JSON.stringify(chunkObj.error)}\n\n`);
            break;
        }
      } catch (parseError) {
        console.warn('[Chat] Failed to parse chunk:', chunk, parseError);
      }
    }

    console.log('[Chat] Stream complete');
  } catch (error) {
    console.error('[Chat] Error in streamChatWithTools:', error);
    throw error;
  }
}
