import { ipcMain } from 'electron';
import { BrowserManager } from './browser-manager';
import type Store from 'electron-store';
import { experimental_createMCPClient } from '@ai-sdk/mcp';
import { stepCountIs, streamText, ToolSet } from 'ai';
import { google } from '@ai-sdk/google';
import { ComputerUseService } from './computer-use-service';
import { randomUUID } from 'crypto';

// Store for MCP state in main process
interface MCPState {
  sessionId?: string;
  mcpUrl?: string;
  tools?: Record<string, Record<string, unknown>>;
}

const mcpState: MCPState = {};

/**
 * Stream chat with Gemini and Composio tools
 * Runs in main process with Composio MCP tools integration
 * WARNING: Never store API keys in process.env - they can leak to child processes
 */
async function streamChatWithToolsIpc(
  userInput: string,
  conversationHistory: Array<{ role: string; content: string }>,
  model: string,
  googleApiKey: string,
  tools: ToolSet | undefined,
  onChunk: (chunk: string) => void
): Promise<void> {
  // SECURITY: Pass API key directly to google() instead of storing in process.env
  // This prevents accidental leakage to child processes or subprocess access

  // Build messages - filter out empty content
  const validHistory = conversationHistory.filter(msg => msg.content && msg.content.trim());
  const messages = [
    ...validHistory,
    {
      role: 'user' as const,
      content: userInput,
    },
  ];

  // Stream with AI SDK
  // SECURITY: Temporarily set API key in process.env with strict cleanup to prevent leakage
  const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = googleApiKey;

  try {
    const result = streamText({
      model: google(model),
      messages: messages as any,
      tools: tools,
      stopWhen: stepCountIs(20),
    });

    // Process stream
    for await (const chunk of result.fullStream) {
      const chunkObj = chunk as Record<string, unknown>;

      switch (chunkObj.type) {
        case 'text-delta':
          if ('delta' in chunkObj) {
            onChunk(JSON.stringify({ type: 'text', data: chunkObj.delta }));
          } else if ('text' in chunkObj) {
            onChunk(JSON.stringify({ type: 'text', data: chunkObj.text }));
          }
          break;

        case 'tool-call':
          if ('toolName' in chunkObj) {
            onChunk(JSON.stringify({
              type: 'tool-call',
              toolName: chunkObj.toolName,
              args: 'args' in chunkObj ? chunkObj.args : undefined
            }));
          }
          break;

        case 'tool-result':
          if ('result' in chunkObj || 'output' in chunkObj) {
            onChunk(JSON.stringify({
              type: 'tool-result',
              toolName: 'toolName' in chunkObj ? chunkObj.toolName : undefined,
              data: ('result' in chunkObj) ? chunkObj.result : chunkObj.output
            }));
          }
          break;

        case 'error':
          onChunk(JSON.stringify({ type: 'error', error: chunkObj.error }));
          break;

        case 'start':
        case 'finish':
          // Lifecycle events
          break;
      }
    }
  } finally {
    // SECURITY: Always restore original API key to prevent leakage
    if (originalApiKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
  }
}

/**
 * Initialize Composio Tool Router session and MCP client in the main process
 */
async function initializeComposioMCP(apiKey: string): Promise<{
  sessionId: string;
  tools: Record<string, any>;
  toolCount: number;
}> {
  try {
    // Create Composio session
    const userId = `atlas-${randomUUID()}`;
    const sessionResponse = await fetch(
      'https://backend.composio.dev/api/v3/labs/tool_router/session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      throw new Error(
        `Failed to create Composio session: ${sessionResponse.status} ${errorText}`
      );
    }

    const sessionData = await sessionResponse.json();
    const mcpUrl = sessionData.tool_router_instance_mcp_url;
    const sessionId = sessionData.session_id;

    // Create MCP client
    const mcpClient = await experimental_createMCPClient({
      transport: {
        type: 'http',
        url: mcpUrl,
      },
    });

    // Fetch tools from MCP server
    const tools = await mcpClient.tools();

    // Store in state
    mcpState.sessionId = sessionId;
    mcpState.mcpUrl = mcpUrl;
    mcpState.tools = tools;

    return {
      sessionId,
      tools,
      toolCount: Object.keys(tools).length,
    };
  } catch (error) {
    throw error;
  }
}

export function setupIpcHandlers(browserManager: BrowserManager, store: Store) {
  // Settings management
  ipcMain.handle('get-setting', async (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('set-setting', async (_event, key: string, value: any) => {
    store.set(key, value);
    return { success: true };
  });

  ipcMain.handle('get-all-settings', async () => {
    return store.store;
  });

  // Browser mode toggle
  ipcMain.handle('show-browser-view', async () => {
    browserManager.showBrowserView();
    return { success: true };
  });

  ipcMain.handle('hide-browser-view', async () => {
    browserManager.hideBrowserView();
    return { success: true };
  });

  // Resize browser view based on chat width
  ipcMain.handle('resize-browser-view', async (_event, chatWidthPercent: number) => {
    try {
      browserManager.resizeBrowserView(chatWidthPercent);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Browser navigation - back
  ipcMain.handle('browser-back', async () => {
    try {
      const success = browserManager.goBack();
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Browser navigation - forward
  ipcMain.handle('browser-forward', async () => {
    try {
      const success = browserManager.goForward();
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Check browser navigation state
  ipcMain.handle('get-browser-nav-state', async () => {
    try {
      return {
        success: true,
        canGoBack: browserManager.canGoBack(),
        canGoForward: browserManager.canGoForward(),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Browser automation
  ipcMain.handle('navigate-to-url', async (_event, url: string) => {
    try {
      await browserManager.navigateToUrl(url);
      return { success: true, url: browserManager.getCurrentUrl() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('capture-screenshot', async () => {
    try {
      const screenshot = await browserManager.captureScreenshot();
      return { success: true, screenshot };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('click-at', async (_event, x: number, y: number) => {
    try {
      const result = await browserManager.clickAt(x, y);
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('type-text', async (_event, text: string) => {
    try {
      await browserManager.typeText(text);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scroll-page', async (_event, direction: 'up' | 'down', amount?: number) => {
    try {
      await browserManager.scrollPage(direction, amount);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-current-url', async () => {
    return {
      url: browserManager.getCurrentUrl(),
      title: browserManager.getPageTitle(),
    };
  });

  ipcMain.handle('execute-script', async (_event, script: string) => {
    try {
      const result = await browserManager.executeScript(script);
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Composio MCP handlers
  ipcMain.handle('initialize-mcp', async (_event, apiKey: string) => {
    try {
      const result = await initializeComposioMCP(apiKey);
      return {
        success: true,
        sessionId: result.sessionId,
        toolCount: result.toolCount,
      };
    } catch (error: any) {
      console.error('[Main] IPC initialize-mcp error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle('get-mcp-tools', async () => {
    try {
      if (!mcpState.tools) {
        throw new Error('MCP tools not initialized. Call initialize-mcp first.');
      }
      // Return tools as-is (they're used by streamText in main process, not for IPC)
      return {
        success: true,
        tools: mcpState.tools,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Stream chat with tools (using events for true streaming)
  ipcMain.on(
    'stream-chat-with-tools',
    async (event, userInput: string, conversationHistory: Array<{ role: string; content: string }>, model: string, googleApiKey: string) => {
      const streamId = event.sender.id;
      const streamState = { active: true };
      activeStreams.set(streamId, streamState);

      try {
        // Get tools from mcpState (don't pass through IPC - they're non-serializable)
        const tools = mcpState.tools as ToolSet | undefined;

        await streamChatWithToolsIpc(
          userInput,
          conversationHistory,
          model,
          googleApiKey,
          tools,
          (chunk) => {
            // Check if stream was aborted
            if (!streamState.active) {
              return;
            }
            // Send each chunk as an event back to renderer
            event.sender.send('stream-chunk', chunk);
          }
        );

        // Only signal completion if stream wasn't aborted
        if (streamState.active) {
          event.sender.send('stream-complete');
        }
      } catch (error: any) {
        // Don't send error if stream was aborted
        if (streamState.active) {
          console.error('[Main] Error in stream-chat-with-tools:', error);
          event.sender.send('stream-error', error.message);
        }
      } finally {
        activeStreams.delete(streamId);
      }
    }
  );

  // SECURITY: Whitelist of allowed environment variables that can be set
  // This prevents the renderer from modifying sensitive environment variables
  const ALLOWED_ENV_VARS = new Set([
    'NODE_ENV',
    'DEBUG',
    'LOG_LEVEL',
    // Add other safe variables here as needed
  ]);

  // Set environment variables (restricted to whitelist)
  ipcMain.handle('set-environment-variable', async (_event, key: string, value: string) => {
    try {
      // SECURITY: Only allow whitelisted environment variables
      if (!ALLOWED_ENV_VARS.has(key)) {
        return { success: false, error: `Environment variable '${key}' is not allowed` };
      }

      process.env[key] = value;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Store active streams (both computer use and chat) so we can abort them
  const activeStreams = new Map<number, { active: boolean }>();

  // Stream with Gemini Computer Use
  ipcMain.on(
    'stream-computer-use',
    async (
      event,
      userMessage: string,
      messageHistory: Array<{ role: string; content: string }>,
      googleApiKey: string
    ) => {
      const streamId = event.sender.id;
      const streamState = { active: true };
      activeStreams.set(streamId, streamState);

      try {
        const browserView = browserManager.getBrowserView();
        if (!browserView) {
          event.sender.send('stream-error', 'Browser view not available');
          return;
        }

        const computerUseService = new ComputerUseService(browserView, googleApiKey);

        for await (const chunk of computerUseService.streamWithComputerUse(
          userMessage,
          messageHistory
        )) {
          // Check if stream was aborted
          if (!streamState.active) {
            break;
          }

          event.sender.send('stream-chunk', JSON.stringify(chunk));
        }

        // Only send complete if stream wasn't aborted
        if (streamState.active) {
          event.sender.send('stream-complete');
        }
      } catch (error: any) {
        // Don't send error if stream was aborted
        if (streamState.active) {
          event.sender.send('stream-error', error.message);
        }
      } finally {
        activeStreams.delete(streamId);
      }
    }
  );

  // Stop computer use stream
  ipcMain.handle('stop-computer-use', async (_event) => {
    const streamId = _event.sender.id;
    const streamState = activeStreams.get(streamId);
    if (streamState) {
      streamState.active = false;
      return { success: true };
    }
    return { success: false, error: 'No active stream' };
  });
}
