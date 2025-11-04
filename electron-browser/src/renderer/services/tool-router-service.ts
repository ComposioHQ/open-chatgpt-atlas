interface ToolRouterState {
  sessionId: string | null;
  tools: Record<string, any> | null;
}

const toolRouterState: ToolRouterState = {
  sessionId: null,
  tools: null,
};

/**
 * Initialize MCP client via IPC (runs in main process to avoid CORS issues)
 * This calls the main process to create Composio session and fetch tools
 */
export async function initializeMcpClient(composioApiKey: string) {
  try {
    console.log('[Renderer] Initializing MCP via IPC...');

    // Call the main process IPC handler via electronAPI
    const result = await window.electronAPI.initializeMcp(composioApiKey);

    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize MCP');
    }

    console.log('[Renderer] MCP initialized:', result.sessionId);
    console.log('[Renderer] Tools available:', result.toolCount);

    toolRouterState.sessionId = result.sessionId || null;

    // Fetch the tools from main process
    const toolsResult = await window.electronAPI.getMcpTools();
    if (!toolsResult.success) {
      throw new Error(toolsResult.error || 'Failed to fetch MCP tools');
    }

    toolRouterState.tools = toolsResult.tools || null;
    console.log('[Renderer] Tools cached in renderer:', toolRouterState.tools ? Object.keys(toolRouterState.tools).length : 0);

    return {
      sessionId: result.sessionId,
      tools: toolRouterState.tools,
    };
  } catch (error) {
    console.error('[Renderer] Failed to initialize MCP client:', error);
    throw error;
  }
}

/**
 * Get available tools from the renderer cache
 * Returns an object of tool objects that can be passed to streamText
 */
export function getMcpTools() {
  if (!toolRouterState.tools) {
    throw new Error('MCP tools not initialized. Call initializeMcpClient first.');
  }

  const tools = toolRouterState.tools;
  console.log('[Renderer] Retrieved MCP tools:', Object.keys(tools).length, 'tools available');

  if (Object.keys(tools).length > 0) {
    console.log('[Renderer] Sample tools:', Object.keys(tools).slice(0, 5).join(', '));
  }

  return tools;
}

/**
 * Get the current session ID
 */
export function getSessionId(): string | null {
  return toolRouterState.sessionId;
}

/**
 * Check if tools are initialized
 */
export function areToolsInitialized(): boolean {
  return toolRouterState.tools !== null && toolRouterState.sessionId !== null;
}
