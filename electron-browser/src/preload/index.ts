import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),

  // Browser mode toggle
  showBrowserView: () => ipcRenderer.invoke('show-browser-view'),
  hideBrowserView: () => ipcRenderer.invoke('hide-browser-view'),
  resizeBrowserView: (chatWidthPercent: number) => ipcRenderer.invoke('resize-browser-view', chatWidthPercent),

  // Browser navigation
  browserBack: () => ipcRenderer.invoke('browser-back'),
  browserForward: () => ipcRenderer.invoke('browser-forward'),
  getBrowserNavState: () => ipcRenderer.invoke('get-browser-nav-state'),

  // Browser automation
  navigateToUrl: (url: string) => ipcRenderer.invoke('navigate-to-url', url),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  clickAt: (x: number, y: number) => ipcRenderer.invoke('click-at', x, y),
  typeText: (text: string) => ipcRenderer.invoke('type-text', text),
  scrollPage: (direction: 'up' | 'down', amount?: number) =>
    ipcRenderer.invoke('scroll-page', direction, amount),
  getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
  executeScript: (script: string) => ipcRenderer.invoke('execute-script', script),

  // Composio MCP
  initializeMcp: (apiKey: string) => ipcRenderer.invoke('initialize-mcp', apiKey),
  getMcpTools: () => ipcRenderer.invoke('get-mcp-tools'),

  // Chat with tools (AI SDK) - uses events for streaming
  streamChatWithTools: (
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }>,
    model: string,
    googleApiKey: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    // Listen for chunks BEFORE sending to avoid race conditions
    const chunkListener = (_event: any, chunk: string) => {
      onChunk(chunk);
    };
    const completeListener = () => {
      ipcRenderer.removeListener('stream-chunk', chunkListener);
      ipcRenderer.removeListener('stream-complete', completeListener);
      ipcRenderer.removeListener('stream-error', errorListener);
      onComplete();
    };
    const errorListener = (_event: any, error: string) => {
      ipcRenderer.removeListener('stream-chunk', chunkListener);
      ipcRenderer.removeListener('stream-complete', completeListener);
      ipcRenderer.removeListener('stream-error', errorListener);
      onError(error);
    };

    ipcRenderer.on('stream-chunk', chunkListener);
    ipcRenderer.once('stream-complete', completeListener);
    ipcRenderer.once('stream-error', errorListener);

    // NOW send the request after listeners are registered
    ipcRenderer.send('stream-chat-with-tools', userInput, conversationHistory, model, googleApiKey);
  },

  // Computer Use with Gemini
  streamComputerUse: (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    googleApiKey: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    // Listen for chunks BEFORE sending to avoid race conditions
    const chunkListener = (_event: any, chunk: string) => {
      onChunk(chunk);
    };
    const completeListener = () => {
      ipcRenderer.removeListener('stream-chunk', chunkListener);
      ipcRenderer.removeListener('stream-complete', completeListener);
      ipcRenderer.removeListener('stream-error', errorListener);
      ipcRenderer.removeListener('stream-action', actionListener);
      onComplete();
    };
    const errorListener = (_event: any, error: string) => {
      ipcRenderer.removeListener('stream-chunk', chunkListener);
      ipcRenderer.removeListener('stream-complete', completeListener);
      ipcRenderer.removeListener('stream-error', errorListener);
      ipcRenderer.removeListener('stream-action', actionListener);
      onError(error);
    };
    const actionListener = () => {
      // Action events are handled as chunks with type 'action'
    };

    ipcRenderer.on('stream-chunk', chunkListener);
    ipcRenderer.on('stream-action', actionListener);
    ipcRenderer.once('stream-complete', completeListener);
    ipcRenderer.once('stream-error', errorListener);

    // NOW send the request after listeners are registered
    ipcRenderer.send('stream-computer-use', userMessage, conversationHistory, googleApiKey);
  },

  // Stop computer use stream
  stopComputerUse: () => ipcRenderer.invoke('stop-computer-use'),

  // Environment variables
  setEnvironmentVariable: (key: string, value: string) => ipcRenderer.invoke('set-environment-variable', key, value),

  // Event listeners
  onBrowserNavigated: (callback: (url: string) => void) => {
    ipcRenderer.on('browser-navigated', (_event, url) => callback(url));
  },

  // IPC event management (for streaming and other async operations)
  on: (channel: string, listener: (...args: any[]) => void) => {
    const wrappedListener = (_event: any, ...args: any[]) => {
      listener(...args);
    };
    ipcRenderer.on(channel, wrappedListener);
    // Store the wrapped listener for cleanup
    const listenerAny = listener as any;
    if (!listenerAny._wrappedListeners) listenerAny._wrappedListeners = {};
    listenerAny._wrappedListeners[channel] = wrappedListener;
  },

  once: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => {
      listener(...args);
    });
  },

  removeListener: (channel: string, listener: (...args: any[]) => void) => {
    const listenerAny = listener as any;
    if (listenerAny._wrappedListeners && listenerAny._wrappedListeners[channel]) {
      ipcRenderer.removeListener(channel, listenerAny._wrappedListeners[channel]);
    }
  },

  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<{ success: boolean }>;
  getAllSettings: () => Promise<Record<string, any>>;
  showBrowserView: () => Promise<{ success: boolean }>;
  hideBrowserView: () => Promise<{ success: boolean }>;
  resizeBrowserView: (chatWidthPercent: number) => Promise<{ success: boolean; error?: string }>;
  browserBack: () => Promise<{ success: boolean; error?: string }>;
  browserForward: () => Promise<{ success: boolean; error?: string }>;
  getBrowserNavState: () => Promise<{ success: boolean; canGoBack?: boolean; canGoForward?: boolean; error?: string }>;
  navigateToUrl: (url: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  captureScreenshot: () => Promise<{ success: boolean; screenshot?: string; error?: string }>;
  clickAt: (x: number, y: number) => Promise<{ success: boolean; result?: any; error?: string }>;
  typeText: (text: string) => Promise<{ success: boolean; error?: string }>;
  scrollPage: (
    direction: 'up' | 'down',
    amount?: number
  ) => Promise<{ success: boolean; error?: string }>;
  getCurrentUrl: () => Promise<{ url: string; title: string }>;
  executeScript: (script: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  initializeMcp: (apiKey: string) => Promise<{ success: boolean; sessionId?: string; toolCount?: number; error?: string }>;
  getMcpTools: () => Promise<{ success: boolean; tools?: Record<string, any>; error?: string }>;
  streamChatWithTools: (
    userInput: string,
    conversationHistory: Array<{ role: string; content: string }>,
    model: string,
    googleApiKey: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => void;
  streamComputerUse: (
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    googleApiKey: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => void;
  stopComputerUse: () => Promise<{ success: boolean; error?: string }>;
  setEnvironmentVariable: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  onBrowserNavigated: (callback: (url: string) => void) => void;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  once: (channel: string, listener: (...args: any[]) => void) => void;
  removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
