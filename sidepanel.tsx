import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Settings } from './types';
import { stepCountIs } from 'ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
}

function ChatSidebar() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [browserToolsEnabled, setBrowserToolsEnabled] = useState(false);
  const [showBrowserToolsWarning, setShowBrowserToolsWarning] = useState(false);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mcpClientRef = useRef<any>(null); // Store MCP client for reuse
  const mcpToolsRef = useRef<any>(null); // Store MCP tools for reuse

  // Execute a tool based on name and parameters
  const executeTool = async (toolName: string, parameters: any, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1500; // 1.5 seconds to allow page to load
    
    return new Promise((resolve, reject) => {
      const handleResponse = (response: any) => {
        const errorMsg = response?.error || chrome.runtime.lastError?.message || '';
        const isConnectionError = errorMsg.includes('Receiving end does not exist') || 
                                 errorMsg.includes('Could not establish connection');
        
        if (isConnectionError && retryCount < MAX_RETRIES) {
          console.warn(`⚠️ Connection error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${errorMsg}`);
          console.log(`🔄 Retrying ${toolName} in ${RETRY_DELAY}ms...`);
          
          setTimeout(async () => {
            try {
              const result = await executeTool(toolName, parameters, retryCount + 1);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, RETRY_DELAY);
        } else {
          // Return response as-is (could be success or error)
          resolve(response);
        }
      };
      
      if (toolName === 'screenshot') {
        chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' }, handleResponse);
      } else if (toolName === 'click') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'click',
          selector: parameters.selector,
          coordinates: parameters.x !== undefined ? { x: parameters.x, y: parameters.y } : undefined
        }, handleResponse);
      } else if (toolName === 'type') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'fill',
          target: parameters.selector,
          value: parameters.text
        }, handleResponse);
      } else if (toolName === 'scroll') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'scroll',
          direction: parameters.direction,
          target: parameters.selector,
          amount: parameters.amount
        }, handleResponse);
      } else if (toolName === 'getPageContext') {
        chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' }, handleResponse);
      } else if (toolName === 'navigate') {
        chrome.runtime.sendMessage({ type: 'NAVIGATE', url: parameters.url }, handleResponse);
      } else if (toolName === 'getBrowserHistory') {
        chrome.runtime.sendMessage({ 
          type: 'GET_HISTORY',
          query: parameters.query,
          maxResults: parameters.maxResults
        }, handleResponse);
      } else if (toolName === 'pressKey') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'press_key',
          key: parameters.key
        }, handleResponse);
      } else if (toolName === 'clearInput') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'clear_input'
        }, handleResponse);
      } else if (toolName === 'keyCombo') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'key_combination',
          keys: parameters.keys
        }, handleResponse);
      } else if (toolName === 'hover') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'hover',
          coordinates: { x: parameters.x, y: parameters.y }
        }, handleResponse);
      } else if (toolName === 'dragDrop') {
        chrome.runtime.sendMessage({ 
          type: 'EXECUTE_ACTION', 
          action: 'drag_drop',
          coordinates: { x: parameters.x, y: parameters.y },
          destination: { x: parameters.destination_x, y: parameters.destination_y }
        }, handleResponse);
      } else {
        reject(new Error(`Unknown tool: ${toolName}`));
      }
    });
  };

  useEffect(() => {
    // Load settings from chrome.storage
    chrome.storage.local.get(['atlasSettings'], async (result) => {
      if (result.atlasSettings) {
        setSettings(result.atlasSettings);
        
        // Initialize Composio Tool Router if API key is present
        if (result.atlasSettings.composioApiKey) {
          try {
            const { initializeComposioToolRouter } = await import('./tools');
            const userId = 'user@extension.local'; // Use a consistent user ID
            const toolRouterSession = await initializeComposioToolRouter(
              result.atlasSettings.composioApiKey,
              userId
            );
            
            // Store the MCP URLs in chrome.storage for use during chat
            chrome.storage.local.set({ 
              composioSessionId: toolRouterSession.sessionId,
              composioChatMcpUrl: toolRouterSession.chatSessionMcpUrl,
              composioToolRouterMcpUrl: toolRouterSession.toolRouterMcpUrl,
            });
            
            console.log('✅ Composio Tool Router initialized!');
            console.log('Session ID:', toolRouterSession.sessionId);
            console.log('Chat MCP URL:', toolRouterSession.chatSessionMcpUrl);
            console.log('Tool Router MCP URL:', toolRouterSession.toolRouterMcpUrl);
          } catch (error) {
            console.error('❌ Failed to initialize Composio Tool Router:', error);
          }
        }
      } else {
        setShowSettings(true);
      }
    });
  }, []);

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const toggleBrowserTools = async () => {
    const newValue = !browserToolsEnabled;

    // Check if user has Google API key before enabling Browser Tools
    if (newValue) {
      if (!settings) {
        alert('⚠️ Please configure your settings first.');
        openSettings();
        return;
      }

      if (settings.provider !== 'google' || !settings.apiKey) {
        const confirmed = window.confirm(
          '🌐 Browser Tools requires a Google API key\n\n' +
          'Browser Tools uses Gemini 2.5 Computer Use for browser automation.\n\n' +
          'Would you like to open Settings to add your Google API key?'
        );
        if (confirmed) {
          openSettings();
        }
        return;
      }
    }

    setBrowserToolsEnabled(newValue);

    if (newValue) {
      // Clear MCP cache when enabling browser tools
      if (mcpClientRef.current) {
        try {
          await mcpClientRef.current.close();
        } catch (error) {
          console.error('Error closing MCP client:', error);
        }
      }
      mcpClientRef.current = null;
      mcpToolsRef.current = null;
      setShowBrowserToolsWarning(false);
    }
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const newChat = async () => {
    // Clear messages
    setMessages([]);
    setInput('');
    setShowBrowserToolsWarning(false);
    
    // Force close and clear ALL cached state
    if (mcpClientRef.current) {
      try {
        await mcpClientRef.current.close();
        console.log('🔄 Closed previous MCP client');
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
    }
    mcpClientRef.current = null;
    mcpToolsRef.current = null;
    
    console.log('🆕 New chat started - all state cleared');
    
    // Reinitialize Composio session if API key present
    if (settings?.composioApiKey) {
      try {
        const { initializeComposioToolRouter } = await import('./tools');
        const userId = 'user@extension.local';
        const toolRouterSession = await initializeComposioToolRouter(
          settings.composioApiKey,
          userId
        );
        
        chrome.storage.local.set({ 
          composioSessionId: toolRouterSession.sessionId,
          composioChatMcpUrl: toolRouterSession.chatSessionMcpUrl,
          composioToolRouterMcpUrl: toolRouterSession.toolRouterMcpUrl,
        });
        
        console.log('🔄 New Composio session created');
        console.log('Session ID:', toolRouterSession.sessionId);
      } catch (error) {
        console.error('Failed to create new Composio session:', error);
      }
    }
  };

  const streamOpenAI = async (messages: Message[], signal: AbortSignal) => {
    // Add initial assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings!.apiKey}`,
      },
      body: JSON.stringify({
        model: settings!.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content += content;
                }
                return updated;
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  };

  // Stream with Gemini Computer Use (direct API with agent loop)
  const streamWithGeminiComputerUse = async (messages: Message[]) => {
    try {
      console.log('🌐 Using Gemini Computer Use API');
      
      // Add initial assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Get initial screenshot and compress it
      let screenshot = await executeTool('screenshot', {});
      console.log('📸 Screenshot result:', JSON.stringify(screenshot, null, 2));

      if (!screenshot || !screenshot.screenshot) {
        const errorMsg = screenshot?.error || 'Unknown error capturing screenshot';
        console.error('❌ Screenshot failed. Full response:', JSON.stringify(screenshot, null, 2));
        throw new Error(`Failed to capture screenshot: ${errorMsg}`);
      }
      
      // Prepare conversation history
      const contents: any[] = [];
      
      // Add message history
      for (const msg of messages) {
        if (msg.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }]
          });
        } else {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
      
      // Add screenshot to latest user message
      if (screenshot && screenshot.screenshot) {
        const lastUserContent = contents[contents.length - 1];
        if (lastUserContent && lastUserContent.role === 'user') {
          lastUserContent.parts.push({
            inline_data: {
              mime_type: 'image/png',
              data: screenshot.screenshot.split(',')[1]
            }
          });
        }
      }
      
      let responseText = '';
      const maxTurns = 30; // Limit agent loop iterations

      // System instructions for Gemini to guide its behavior
      const systemInstruction = `You are a browser automation assistant with ONLY browser control capabilities.

CRITICAL: You can ONLY use the computer_use tool functions for browser automation. DO NOT attempt to call any other functions like print, execute, or any programming functions.

AVAILABLE ACTIONS (computer_use tool only):
- click / click_at: Click at coordinates
- type_text_at: Type text (optionally with press_enter)
- scroll / scroll_down / scroll_up: Scroll the page
- navigate: Navigate to a URL
- wait / wait_5_seconds: Wait for page load

GUIDELINES:
1. NAVIGATION: Use 'navigate' function to go to websites
   Example: navigate({url: "https://www.reddit.com"})

2. INTERACTION: Use coordinates from the screenshot you see
   - Click at coordinates to interact with elements
   - Type text at coordinates to fill forms

3. NO HALLUCINATING: Only use the functions listed above. Do NOT invent or call functions like print(), execute(), or any code functions.

4. EFFICIENCY: Complete tasks in fewest steps possible.`;

      // Agent loop
      for (let turn = 0; turn < maxTurns; turn++) {
        console.log(`\n--- Turn ${turn + 1}/${maxTurns} ---`);

        const requestBody = {
          contents,
          tools: [{
            computer_use: {
              environment: 'ENVIRONMENT_BROWSER'
            }
          }],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 1.0,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            }
          ]
        };
        
        // Create abort controller with timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 second timeout
        
        // Always use computer-use model for browser tools
        const computerUseModel = 'gemini-2.5-computer-use-preview-10-2025';

        let response;
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${computerUseModel}:generateContent?key=${settings!.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              signal: abortController.signal,
            }
          );
        } finally {
          clearTimeout(timeoutId);
        }
        
        if (!response.ok) {
          let errorDetails;
          try {
            errorDetails = await response.json();
            console.error('❌ Gemini API Error Response:', JSON.stringify(errorDetails, null, 2));
          } catch (e) {
            console.error('❌ Failed to parse error response:', e);
            errorDetails = { statusText: response.statusText };
          }

          const errorMessage = errorDetails?.error?.message || `API request failed with status ${response.status}: ${response.statusText}`;
          console.error('❌ Full error details:', errorDetails);

          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('📦 Gemini API Response:', JSON.stringify(data, null, 2));

        // Check for safety blocks and prompt feedback
        if (data.promptFeedback?.blockReason) {
          const blockReason = data.promptFeedback.blockReason;
          console.error('🚫 Request blocked by safety filter:', blockReason);

          // Show detailed error to user
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = `⚠️ **Safety Filter Blocked Request**\n\nReason: ${blockReason}\n\nThis request was blocked by Gemini's safety filters. Try:\n- Using a different webpage\n- Simplifying your request\n- Avoiding sensitive actions\n\nFull response:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            }
            return updated;
          });
          return; // Exit the loop
        }

        const candidate = data.candidates?.[0];

        if (!candidate) {
          console.error('❌ No candidate in response. Full response:', JSON.stringify(data, null, 2));
          throw new Error(`No candidate in Gemini response. Finish reason: ${data.candidates?.[0]?.finishReason || 'unknown'}. Full response: ${JSON.stringify(data)}`);
        }

        // Check if candidate has safety response requiring confirmation
        const safetyResponse = candidate.safetyResponse;
        if (safetyResponse?.requireConfirmation) {
          console.log('⚠️ Action requires user confirmation');

          // Show confirmation dialog to user
          const confirmMessage = safetyResponse.message || 'This action requires confirmation. Do you want to proceed?';
          const userConfirmed = window.confirm(`🔒 Human Confirmation Required\n\n${confirmMessage}\n\nProceed with this action?`);

          if (!userConfirmed) {
            console.log('❌ User denied confirmation');
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content += '\n\n❌ Action cancelled by user.';
              }
              return updated;
            });
            return; // Exit the loop
          }

          console.log('✅ User confirmed action');
          // Add confirmation to conversation
          contents.push({
            role: 'user',
            parts: [{ text: 'CONFIRMED: User approved this action. Please proceed.' }]
          });

          // Continue to next iteration to re-run with confirmation
          continue;
        }

        // Add model response to conversation
        contents.push(candidate.content);
        
        // Check if there are function calls
        const parts = candidate.content?.parts || [];
        const hasFunctionCalls = parts.some((p: any) => p.functionCall);
        
        if (!hasFunctionCalls) {
          // No more actions - task complete
          console.log('✅ Task complete - no more function calls');
          for (const part of parts) {
            if (part.text) {
              responseText += part.text;
            }
          }
          break;
        }
        
        // Execute function calls
        const functionResponses: any[] = [];
        
        for (const part of parts) {
          if (part.text) {
            responseText += part.text + '\n';
          } else if (part.functionCall) {
            const funcName = part.functionCall.name;
            const funcArgs = part.functionCall.args || {};
            
            console.log('🔧 Executing:', funcName, 'with args:', JSON.stringify(funcArgs));
            responseText += `\n[Executing: ${funcName}]\n`;
            
            // Execute the browser action
            const result = await executeBrowserAction(funcName, funcArgs);
            console.log('✅ Action result:', result);
            
            // Wait longer after navigation actions for page to load
            const isNavigationAction = ['navigate', 'open_web_browser', 'navigate_to', 'go_to', 'click', 'click_at', 'mouse_click'].includes(funcName);
            if (isNavigationAction) {
              console.log('⏳ Waiting for page to load after navigation/click...');
              await new Promise(resolve => setTimeout(resolve, 2500)); // Wait 2.5 seconds for page to load
            } else {
              await new Promise(resolve => setTimeout(resolve, 500)); // Normal wait
            }
            
            screenshot = await executeTool('screenshot', {});
            
            if (!screenshot || !screenshot.screenshot) {
              console.warn('Failed to capture screenshot after action');
              screenshot = { screenshot: '' }; // Continue without screenshot
            }
            
            // Get current page URL and viewport dimensions (required by Gemini)
            let currentUrl = '';
            let viewportInfo = '';
            try {
              const pageInfo = await executeTool('getPageContext', {});
              currentUrl = pageInfo?.url || '';

              // Include viewport dimensions to help Gemini understand coordinate space
              if (pageInfo?.viewport) {
                viewportInfo = ` Viewport: ${pageInfo.viewport.width}x${pageInfo.viewport.height}`;
              }

              console.log('📍 Current URL:', currentUrl, viewportInfo);
            } catch (error) {
              console.warn('Failed to get page URL:', error);
            }

            // Build function response with URL and viewport info (required by Gemini)
            const functionResponse: any = {
              name: funcName,
              response: {
                ...result,
                url: currentUrl,  // Gemini requires this
                viewport_info: viewportInfo,
                success: result.success !== false
              }
            };
            
            functionResponses.push(functionResponse);
            
            // Update UI
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content = responseText;
              }
              return updated;
            });
          }
        }
        
        // Add function responses back to conversation with new screenshot
        if (functionResponses.length > 0) {
          const userParts: any[] = functionResponses.map(fr => ({
            function_response: fr
          }));
          
          // Add new screenshot
          if (screenshot && screenshot.screenshot) {
            userParts.push({
              inline_data: {
                mime_type: 'image/png',
                data: screenshot.screenshot.split(',')[1]
              }
            });
          }
          
          contents.push({
            role: 'user',
            parts: userParts
          });
        }
      }
      
      // Final update
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = responseText || 'Task completed';
        }
        return updated;
      });
      
    } catch (error: any) {
      console.error('❌ Error with Gemini Computer Use:');
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', error);
      throw error;
    }
  };

  // Scale coordinates from Gemini's 1000x1000 grid to actual viewport
  const scaleCoordinates = async (x: number, y: number) => {
    try {
      // Get actual viewport dimensions
      const pageInfo = await executeTool('getPageContext', {});
      const viewportWidth = pageInfo?.viewport?.width || 1440;
      const viewportHeight = pageInfo?.viewport?.height || 900;

      // Gemini uses 1000x1000 normalized coordinates
      const scaledX = Math.round((x / 1000) * viewportWidth);
      const scaledY = Math.round((y / 1000) * viewportHeight);

      console.log(`📐 Coordinate scaling: (${x}, ${y}) -> (${scaledX}, ${scaledY}) | Viewport: ${viewportWidth}x${viewportHeight}`);

      return { x: scaledX, y: scaledY };
    } catch (error) {
      console.error('Failed to scale coordinates:', error);
      // Fallback to original coordinates if scaling fails
      return { x, y };
    }
  };

  // Check if action requires user confirmation (human-in-the-loop)
  const requiresUserConfirmation = async (functionName: string, args: any): Promise<boolean> => {
    // Get current page context to check for sensitive pages
    let pageContext: any = {};
    try {
      pageContext = await executeTool('getPageContext', {});
    } catch (e) {
      console.warn('Could not get page context for confirmation check');
    }

    const url = pageContext?.url?.toLowerCase() || '';
    const pageText = pageContext?.text?.toLowerCase() || '';

    // High-risk actions that always require confirmation
    const alwaysConfirm = [
      'key_combination', // Keyboard shortcuts could be dangerous
    ];

    // Check for sensitive pages (checkout, payment, login, admin)
    const isSensitivePage =
      url.includes('checkout') ||
      url.includes('payment') ||
      url.includes('login') ||
      url.includes('signin') ||
      url.includes('admin') ||
      url.includes('delete') ||
      url.includes('remove') ||
      pageText.includes('checkout') ||
      pageText.includes('payment') ||
      pageText.includes('purchase') ||
      pageText.includes('confirm order') ||
      pageText.includes('delete') ||
      pageText.includes('remove account');

    // Check for sensitive text input (passwords, credit cards, etc.)
    const isSensitiveInput = functionName.includes('type') && (
      args.text?.toLowerCase().includes('password') ||
      args.text?.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/) || // Credit card pattern
      pageText.includes('credit card') ||
      pageText.includes('cvv') ||
      pageText.includes('social security')
    );

    // Check for form submission via Enter key
    const isFormSubmission = functionName === 'type_text_at' && args.press_enter === true;

    if (alwaysConfirm.includes(functionName) || isSensitivePage || isSensitiveInput || isFormSubmission) {
      const confirmMessage = `🔒 Confirm Action\n\n` +
        `Action: ${functionName}\n` +
        `Page: ${url}\n` +
        `${isSensitivePage ? '⚠️ This appears to be a sensitive page (checkout/login/admin)\n' : ''}` +
        `${isSensitiveInput ? '⚠️ This appears to involve sensitive data\n' : ''}` +
        `${isFormSubmission ? '⚠️ This will submit a form\n' : ''}` +
        `\nDo you want to proceed?`;

      return !window.confirm(confirmMessage);
    }

    return false; // No confirmation needed
  };

  // Execute browser action from Gemini function call
  const executeBrowserAction = async (functionName: string, args: any) => {
    console.log('🎯 Executing Gemini action:', functionName, args);

    // Check if this action requires user confirmation
    const needsConfirmation = await requiresUserConfirmation(functionName, args);
    if (needsConfirmation) {
      console.log('❌ Action cancelled by user (human-in-the-loop)');
      return { success: false, error: 'Action cancelled by user', userCancelled: true };
    }

    switch (functionName) {
      case 'click':
      case 'click_at':
      case 'mouse_click':
        // Scale coordinates from Gemini's 1000x1000 grid to actual viewport
        const clickCoords = await scaleCoordinates(
          args.x || args.coordinate?.x || 0,
          args.y || args.coordinate?.y || 0
        );
        return await executeTool('click', clickCoords);
      
      case 'type':
      case 'type_text':
      case 'keyboard_input':
      case 'input_text':
        return await executeTool('type', { 
          selector: 'input:focus, textarea:focus, [contenteditable="true"]:focus', 
          text: args.text || args.input || args.content
        });
      
      case 'scroll':
      case 'scroll_down':
      case 'scroll_up':
      case 'mouse_scroll':
        const direction = functionName === 'scroll_up' ? 'up' : 
                         functionName === 'scroll_down' ? 'down' : 
                         args.direction || 'down';
        return await executeTool('scroll', { 
          direction,
          amount: args.amount || args.pixels || args.delta || 500
        });
      
      case 'navigate':
      case 'open_web_browser':
      case 'navigate_to':
      case 'go_to':
        return await executeTool('navigate', { 
          url: args.url || args.address || args.uri
        });
      
      case 'get_screenshot':
      case 'take_screenshot':
      case 'screenshot':
        return await executeTool('screenshot', {});
      
      case 'get_page_info':
      case 'get_url':
      case 'get_page_content':
        return await executeTool('getPageContext', {});
      
      case 'wait':
      case 'sleep':
      case 'delay':
        const waitTime = (args.seconds || args.milliseconds / 1000 || 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return { success: true, message: `Waited ${waitTime}ms` };
      
      case 'press_key':
      case 'key_press':
        // Handle special keys like Enter, Tab, etc.
        return await executeTool('type', { 
          selector: 'input:focus, textarea:focus, [contenteditable="true"]:focus', 
          text: args.key || args.keyCode
        });
      
      case 'type_text_at':
        // Type text at coordinates (click first, then type)
        // This mimics Python's playwright keyboard.type() behavior
        if (args.x !== undefined && args.y !== undefined) {
          // Scale coordinates before clicking
          const typeCoords = await scaleCoordinates(args.x, args.y);
          await executeTool('click', typeCoords);
          // Wait for element to focus
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Clear existing text if requested
        if (args.clear_before_typing !== false) {
          // Use keyboard shortcuts to select all and delete (like Python implementation)
          const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
          if (isMac) {
            await executeTool('keyCombo', { keys: ['Meta', 'a'] });
          } else {
            await executeTool('keyCombo', { keys: ['Control', 'a'] });
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          await executeTool('pressKey', { key: 'Delete' });
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Use keyboard_type action which simulates actual keyboard typing
        const typeResult = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'EXECUTE_ACTION',
              action: 'keyboard_type',
              value: args.text || args.content
            },
            (response) => {
              resolve(response);
            }
          );
        });

        // If press_enter is requested, send Enter key
        if (args.press_enter) {
          await new Promise(resolve => setTimeout(resolve, 100));
          await executeTool('pressKey', { key: 'Enter' });
        }

        return typeResult;
      
      case 'key_combination':
        // Press keyboard key combinations like ["Control", "A"] or ["Enter"]
        const keys = args.keys || [args.key] || ['Enter'];
        return await executeTool('keyCombo', { keys });
      
      case 'hover_at':
        // Hover mouse at coordinates
        const hoverCoords = await scaleCoordinates(args.x || 0, args.y || 0);
        return await executeTool('hover', hoverCoords);
      
      case 'scroll_document':
        // Scroll the entire page
        const scrollDir = args.direction || 'down';
        return await executeTool('scroll', { direction: scrollDir, amount: 800 });
      
      case 'scroll_at':
        // Scroll at specific coordinates
        return await executeTool('scroll', { 
          direction: args.direction || 'down', 
          amount: args.magnitude || 800 
        });
      
      case 'wait_5_seconds':
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { success: true, message: 'Waited 5 seconds' };
      
      case 'go_back':
      case 'back':
        // Go back in browser history
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.goBack(tabs[0].id);
          }
        });
        return { success: true, message: 'Navigated back' };
      
      case 'go_forward':
      case 'forward':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.goForward(tabs[0].id);
          }
        });
        return { success: true, message: 'Navigated forward' };
      
      case 'search':
        // Navigate to Google search
        return await executeTool('navigate', { url: 'https://www.google.com' });
      
      case 'drag_and_drop':
        return await executeTool('dragDrop', { 
          x: args.x, 
          y: args.y, 
          destination_x: args.destination_x, 
          destination_y: args.destination_y 
        });
      
      default:
        console.warn('⚠️ Unknown Gemini function:', functionName, args);
        return { success: false, error: `Unknown function: ${functionName}`, args };
    }
  };

  // Stream with AI SDK using MCP tools
  const streamWithAISDKAndMCP = async (messages: Message[], tools: any) => {
    try {
      console.log('🚀 Using AI SDK streamText with MCP tools');
      
      // Import streamText and provider SDKs
      const { streamText } = await import('ai');
      
      // Import the appropriate provider SDK
      let model: any;
      if (settings!.provider === 'openai') {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const openaiClient = createOpenAI({ apiKey: settings!.apiKey });
        model = openaiClient(settings!.model);
      } else if (settings!.provider === 'anthropic') {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const anthropicClient = createAnthropic({ apiKey: settings!.apiKey });
        model = anthropicClient(settings!.model);
      } else if (settings!.provider === 'google') {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const googleClient = createGoogleGenerativeAI({ apiKey: settings!.apiKey });
        model = googleClient(settings!.model);
      }
      
      console.log('📦 Model:', settings!.provider, settings!.model);
      console.log('🛠️ Tools:', Object.keys(tools).join(', '));
      
      // Convert messages to AI SDK format
      const aiMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

        const result = streamText({
          model,
          tools,
          messages: aiMessages,
          stopWhen: stepCountIs(20),
        });
      
      // Add initial assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Stream the response
      for await (const textPart of result.textStream) {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content += textPart;
          }
          return updated;
        });
      }
      
    } catch (error) {
      console.error('❌ Error streaming with AI SDK:', error);
      throw error;
    }
  };

  const streamAnthropic = async (messages: Message[], signal: AbortSignal) => {
    // Add initial assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings!.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings!.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const json = JSON.parse(data);

            // Handle text content
            if (json.type === 'content_block_delta' && json.delta?.text) {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content += json.delta.text;
                }
                return updated;
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  };

  const streamGoogle = async (messages: Message[], signal: AbortSignal) => {
    // Add initial assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${settings!.model}:streamGenerateContent?key=${settings!.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
        }),
        signal,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google API request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content += text;
              }
              return updated;
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !settings) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsUserScrolled(false); // Reset scroll state when user sends message

    abortControllerRef.current = new AbortController();

    try {
      console.log('🚀 Provider:', settings.provider, '| Composio:', settings.composioApiKey ? 'enabled' : 'disabled', '| Browser Tools:', browserToolsEnabled);

      // BROWSER TOOLS MODE - Use Gemini Computer Use API
      if (browserToolsEnabled) {
        console.log('🌐 Browser Tools Mode - Using Gemini Computer Use');

        // Safety check: Ensure we have Google API key
        if (settings.provider !== 'google' || !settings.apiKey) {
          setBrowserToolsEnabled(false);
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = '⚠️ **Browser Tools requires a Google API key**\n\nBrowser Tools uses Gemini 2.5 Computer Use.\n\nPlease:\n1. Open Settings (⚙️)\n2. Select "Google" as provider\n3. Add your Google API key\n4. Try again';
            }
            return updated;
          });
          setIsLoading(false);
          return;
        }

        // Clear any cached MCP state to prevent conflicts
        if (mcpClientRef.current) {
          try {
            await mcpClientRef.current.close();
          } catch (e) {
            // Ignore close errors
          }
          mcpClientRef.current = null;
          mcpToolsRef.current = null;
        }

        await streamWithGeminiComputerUse(newMessages);
      }
      // TOOL ROUTER MODE - Works with ALL providers using AI SDK
      else if (settings.composioApiKey) {
        // Check if using computer-use model (which is incompatible with tool-router)
        const isComputerUseModel = settings.model === 'gemini-2.5-computer-use-preview-10-2025';
        if (isComputerUseModel && settings.provider === 'google') {
          const fallbackSettings = { ...settings, model: 'gemini-2.5-pro' };
          setSettings(fallbackSettings);
          console.warn('⚠️ Computer Use model cannot be used with MCP tools. Switching to gemini-2.5-pro');
        }

        // Reuse existing MCP client and tools if available
        if (mcpClientRef.current && mcpToolsRef.current) {
          console.log('♻️ Reusing existing MCP client and tools');
          await streamWithAISDKAndMCP(newMessages, mcpToolsRef.current);
        } else {
          // Create new MCP client and fetch tools
          const storage = await chrome.storage.local.get(['composioToolRouterMcpUrl', 'composioSessionId', 'atlasSettings']);
          if (storage.composioToolRouterMcpUrl && storage.composioSessionId) {
            console.log('🔧 Creating new MCP client with StreamableHTTP transport...');
            const { experimental_createMCPClient } = await import('ai');
            const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
            const composioApiKey = storage.atlasSettings?.composioApiKey;
            
            const url = new URL(storage.composioToolRouterMcpUrl);
            
            const transportOptions: any = {
              sessionId: storage.composioSessionId,
            };
            
            if (composioApiKey) {
              transportOptions.headers = {
                'x-api-key': composioApiKey,
              };
            }
            
            const mcpClient = await experimental_createMCPClient({
              transport: new StreamableHTTPClientTransport(url, transportOptions),
            });
            
            console.log('✅ MCP client created, fetching tools...');
            const mcpTools = await mcpClient.tools();
            const toolCount = Object.keys(mcpTools).length;
            console.log(`✅ Got ${toolCount} MCP tools:`, Object.keys(mcpTools).join(', '));
            
            if (toolCount > 0) {
              // Store for reuse
              mcpClientRef.current = mcpClient;
              mcpToolsRef.current = mcpTools;
              
              // Use AI SDK's streamText with MCP tools only
              await streamWithAISDKAndMCP(newMessages, mcpTools);
            } else {
              console.warn('⚠️ No tools found, using regular chat');
              await mcpClient.close();
              if (settings.provider === 'openai') await streamOpenAI(newMessages, abortControllerRef.current.signal);
              else if (settings.provider === 'anthropic') await streamAnthropic(newMessages, abortControllerRef.current.signal);
              else await streamGoogle(newMessages, abortControllerRef.current.signal);
            }
          } else {
            console.warn('⚠️ No MCP URL - fallback to regular chat');
            if (settings.provider === 'openai') await streamOpenAI(newMessages, abortControllerRef.current.signal);
            else if (settings.provider === 'anthropic') await streamAnthropic(newMessages, abortControllerRef.current.signal);
            else await streamGoogle(newMessages, abortControllerRef.current.signal);
          }
        }
      }
      // REGULAR MODE
      else {
        if (settings.provider === 'openai') await streamOpenAI(newMessages, abortControllerRef.current.signal);
        else if (settings.provider === 'anthropic') await streamAnthropic(newMessages, abortControllerRef.current.signal);
        else await streamGoogle(newMessages, abortControllerRef.current.signal);
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Chat error occurred:');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', error);

      if (error.name !== 'AbortError') {
        // Show detailed error message to user
        const errorDetails = error?.stack || JSON.stringify(error, null, 2);
        setMessages(prev => {
          const updated = prev.filter(m => m.content !== '');
          return [
            ...updated,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Error: ${error.message}\n\nDetails:\n\`\`\`\n${errorDetails}\n\`\`\``,
            },
          ];
        });
      }
      setIsLoading(false);
    }
  };

  // Check if user is scrolled to bottom
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Handle scroll detection
  const handleScroll = () => {
    setIsUserScrolled(!isAtBottom());
  };

  // Auto-scroll to bottom when messages change (unless user scrolled up)
  useEffect(() => {
    if (!isUserScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUserScrolled]);

  // Attach scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (showSettings && !settings) {
    return (
      <div className="chat-container">
        <div className="welcome-message" style={{ padding: '40px 20px' }}>
          <h2>Welcome to Atlas</h2>
          <p style={{ marginBottom: '20px' }}>Please configure your AI provider to get started.</p>
          <button
            onClick={openSettings}
            className="send-button"
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ flex: 1 }}>
          <h1>Atlas</h1>
          <p>
            {(settings?.provider
              ? settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)
              : 'Unknown')} · {browserToolsEnabled ? 'gemini-2.5-computer-use-preview-10-2025' : (settings?.model || 'No model')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleBrowserTools}
            className={`settings-icon-btn ${browserToolsEnabled ? 'active' : ''}`}
            title={browserToolsEnabled ? 'Disable Browser Tools' : 'Enable Browser Tools'}
            disabled={isLoading}
            style={{
              background: browserToolsEnabled ? '#2563eb' : 'transparent',
              color: browserToolsEnabled ? 'white' : '#343541',
              fontWeight: 600,
            }}
          >
            {browserToolsEnabled ? '◉' : '○'}
          </button>
          <button
            onClick={newChat}
            className="settings-icon-btn"
            title="New Chat"
            disabled={isLoading}
          >
            +
          </button>
          <button
            onClick={openSettings}
            className="settings-icon-btn"
            title="Settings"
          >
            ⋯
          </button>
        </div>
      </div>

      {showBrowserToolsWarning && (
        <div style={{
          padding: '12px 16px',
          background: '#fef3c7',
          borderBottom: '1px solid #fbbf24',
          fontSize: '13px',
          color: '#92400e',
        }}>
          <strong>Browser Tools Enabled!</strong> Now using Gemini 2.5 Computer Use Preview (overrides your selected model).
          {!settings?.apiKey && (
            <span> Please <a href="#" onClick={(e) => { e.preventDefault(); openSettings(); }} style={{ color: '#2563eb', textDecoration: 'underline' }}>set your Google API key</a> in settings.</span>
          )}
        </div>
      )}

      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>How can I help you today?</h2>
            <p>I'm Atlas, your AI assistant. I can help you browse the web, analyze content, and perform various tasks.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="message-content">
                {message.content ? (
                  message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )
                ) : (
                  isLoading && message.role === 'assistant' && (
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Atlas..."
          disabled={isLoading}
          className="chat-input"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="send-button stop-button"
          >
            ⬛
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="send-button"
          >
            ↑
          </button>
        )}
      </form>
      <div ref={messagesEndRef} />
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<ChatSidebar />);
