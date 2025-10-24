// Computer Use and Tool Router integration

import { tool } from 'ai';
import { z } from 'zod';

// Computer Use Tools - Browser automation tools
export const computerUseTools = {
  screenshot: tool({
    description: 'Take a screenshot of the current browser viewport. Use this to see what is currently visible on the page.',
    parameters: z.object({}),
    execute: async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' }, (response) => {
          resolve(response);
        });
      });
    },
  }),

  click: tool({
    description: 'Click on an element at specific coordinates or using a CSS selector',
    parameters: z.object({
      selector: z.string().optional().describe('CSS selector of the element to click'),
      x: z.number().optional().describe('X coordinate (if not using selector)'),
      y: z.number().optional().describe('Y coordinate (if not using selector)'),
    }),
    execute: async ({ selector, x, y }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'EXECUTE_ACTION', 
            action: 'click',
            selector,
            coordinates: x !== undefined && y !== undefined ? { x, y } : undefined
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  type: tool({
    description: 'Type text into an input field',
    parameters: z.object({
      selector: z.string().describe('CSS selector of the input element'),
      text: z.string().describe('Text to type'),
    }),
    execute: async ({ selector, text }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'EXECUTE_ACTION', 
            action: 'fill',
            target: selector,
            value: text
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  mouse_move: tool({
    description: 'Move the mouse cursor to specific coordinates',
    parameters: z.object({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
    execute: async ({ x, y }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'EXECUTE_ACTION', 
            action: 'mouse_move',
            coordinates: { x, y }
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  scroll: tool({
    description: 'Scroll the page in a specific direction or to a specific element',
    parameters: z.object({
      direction: z.enum(['up', 'down', 'top', 'bottom']).optional().describe('Direction to scroll'),
      selector: z.string().optional().describe('CSS selector to scroll to'),
      amount: z.number().optional().describe('Amount to scroll in pixels'),
    }),
    execute: async ({ direction, selector, amount }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'EXECUTE_ACTION', 
            action: 'scroll',
            direction,
            target: selector,
            amount
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  getPageContext: tool({
    description: 'Get comprehensive information about the current page including URL, title, content, links, images, and forms',
    parameters: z.object({}),
    execute: async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' }, (response) => {
          resolve(response);
        });
      });
    },
  }),

  executeJavaScript: tool({
    description: 'Execute custom JavaScript code on the current page',
    parameters: z.object({
      code: z.string().describe('JavaScript code to execute'),
    }),
    execute: async ({ code }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'EXECUTE_SCRIPT',
            code
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  navigate: tool({
    description: 'Navigate to a specific URL',
    parameters: z.object({
      url: z.string().describe('URL to navigate to'),
    }),
    execute: async ({ url }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'NAVIGATE',
            url
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  getBrowserHistory: tool({
    description: 'Get browser history to understand user context',
    parameters: z.object({
      query: z.string().optional().describe('Search query'),
      maxResults: z.number().optional().default(50),
    }),
    execute: async ({ query, maxResults }) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'GET_HISTORY',
            query,
            maxResults
          }, 
          (response) => {
            resolve(response);
          }
        );
      });
    },
  }),

  getBookmarks: tool({
    description: 'Get user bookmarks',
    parameters: z.object({}),
    execute: async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (response) => {
          resolve(response);
        });
      });
    },
  }),
};

// Composio Tool Router integration
// Based on https://docs.composio.dev/docs/tool-router/quick-start
//
// Tool Router provides an MCP (Model Context Protocol) URL that the AI SDK uses to access tools.
// We use Composio's REST API directly instead of the SDK to avoid Node.js dependencies.

export async function initializeComposioToolRouter(apiKey: string, userId: string) {
  try {
    // Create a Tool Router session using Composio's REST API
    // This returns MCP URLs that the AI SDK can connect to
    const response = await fetch('https://backend.composio.dev/api/v3/labs/tool_router/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Composio session: ${response.status} ${errorText}`);
    }

    const session = await response.json();
    
    // Response format:
    // {
    //   "session_id": "session_123456789",
    //   "chat_session_mcp_url": "https://api.composio.dev/v3/mcp/tool-router/session_123456789/mcp",
    //   "tool_router_instance_mcp_url": "https://api.composio.dev/v3/mcp/tool-router/session_123456789/mcp"
    // }

    return {
      sessionId: session.session_id,
      chatSessionMcpUrl: session.chat_session_mcp_url,
      toolRouterMcpUrl: session.tool_router_instance_mcp_url,
    };
  } catch (error) {
    console.error('Error initializing Composio Tool Router:', error);
    throw error;
  }
}

// Fetch tools from the MCP server URL using AI SDK's MCP client
// Reference: https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
export async function getToolsFromMCP(mcpUrl: string, apiKey?: string) {
  try {
    console.log('🔍 Creating MCP client for:', mcpUrl);
    
    // Use AI SDK's MCP client with SSE transport
    const { experimental_createMCPClient } = await import('ai');
    
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const mcpClient = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: mcpUrl,
        ...(Object.keys(headers).length > 0 && { headers })
      },
    });
    
    console.log('✅ MCP client created, fetching tools...');
    
    // Get tools using schema discovery (automatic)
    const tools = await mcpClient.tools();
    
    console.log('✅ Got tools from MCP:', Object.keys(tools).length, 'tools');
    console.log('Tool names:', Object.keys(tools).join(', '));
    
    // Close the client after getting tools
    await mcpClient.close();
    
    return tools;
  } catch (error) {
    console.error('❌ Error fetching tools from MCP:', error);
    return {};
  }
}

// Execute a tool via the MCP URL
export async function executeToolViaMCP(mcpUrl: string, toolName: string, parameters: any) {
  try {
    console.log(`🔧 Executing MCP tool "${toolName}" with params:`, parameters);
    
    // MCP standard endpoint for calling tools
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: parameters,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to execute tool (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ MCP tool result:', data);
    
    // MCP returns result in JSONRPC format
    return data.result || data;
  } catch (error) {
    console.error(`❌ Error executing MCP tool "${toolName}":`, error);
    throw error;
  }
}

