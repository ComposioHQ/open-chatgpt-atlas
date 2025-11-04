/**
 * Computer Use Service for Renderer Process
 * Handles IPC communication with main process for Gemini Computer Use
 * Only available in browser mode
 *
 * NOTE: Uses the preload's streamComputerUse function which properly sets up IPC listeners
 */

export async function streamWithComputerUse(
  userMessage: string,
  messageHistory: Array<{ role: string; content: string }>,
  googleApiKey: string,
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  return new Promise((resolve) => {
    // Use the preload's streamComputerUse function which properly handles IPC
    window.electronAPI.streamComputerUse(
      userMessage,
      messageHistory,
      googleApiKey,
      (chunk: string) => {
        // Preload sends stringified chunks, we need to parse them
        try {
          const parsed = JSON.parse(chunk);
          console.log('[ComputerUseService] Parsed chunk:', parsed.type);
          onChunk(parsed);
        } catch (e) {
          // If it's not JSON, it's raw text
          console.log('[ComputerUseService] Received non-JSON chunk, treating as text');
          onChunk({ type: 'text', content: chunk });
        }
      },
      () => {
        console.log('[ComputerUseService] Stream complete');
        onComplete();
        resolve();
      },
      (error: string) => {
        console.error('[ComputerUseService] Stream error:', error);
        onError(error);
        resolve(); // Resolve instead of reject to avoid showing error toast
      }
    );
  });
}
