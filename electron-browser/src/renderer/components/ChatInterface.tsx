import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, Settings } from '../types';
import { streamWithGemini } from '../services/gemini-service';
import { initializeMcpClient, areToolsInitialized } from '../services/tool-router-service';
import { ToolCallComponent } from './ToolCallComponent';

// Custom link component that opens URLs in browser sidebar
const LinkComponent = ({
  href,
  children,
  onOpenBrowser
}: {
  href?: string;
  children?: React.ReactNode;
  onOpenBrowser?: (url: string) => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (href) {
      onOpenBrowser?.(href);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
      title={href}
    >
      {children}
    </a>
  );
};

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  settings: Settings | null;
  currentMode: 'chat' | 'web';
  onModeChange: (mode: 'chat' | 'web') => void;
  isSidebarLayout?: boolean;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  onLinkClick?: (url: string) => void;
}

const ChatInterface = ({
  messages,
  setMessages,
  settings,
  currentMode,
  onModeChange,
  isSidebarLayout = false,
  onNewChat,
  onOpenSettings,
  onLinkClick,
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'chat' | 'browser'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !settings?.googleApiKey) {
      alert('Please enter a message and configure your API key in settings');
      return;
    }

    setIsLoading(true);
    setShowModeDropdown(false);

    const mode = selectedMode === 'browser' ? 'web' : 'chat';
    if (mode !== currentMode) {
      onModeChange(mode);
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      role: 'user',
      content: input.trim(),
      mode,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    abortControllerRef.current = new AbortController();

    try {
      // Use appropriate stream service based on mode
      if (mode === 'chat') {
        // Chat mode: Initialize MCP tools on first chat (if not already initialized)
        if (!areToolsInitialized() && settings?.composioApiKey) {
          try {
            await initializeMcpClient(settings.composioApiKey);
          } catch (error) {
            // Continue without tools if initialization fails
          }
        }

        // Chat mode: always use AI SDK with Composio tools (if available)
        await new Promise<void>((resolve, reject) => {
          window.electronAPI.streamChatWithTools(
            userMessage.content,
            messages,
            settings.model,
            settings.googleApiKey,
            (chunk) => {
              try {
                const chunkObj = JSON.parse(chunk);

                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== 'assistant') {
                    const newMsg: Message = {
                      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                      role: 'assistant',
                      content: '',
                      mode,
                      toolCalls: []
                    };

                    if (chunkObj.type === 'text') {
                      newMsg.content = String(chunkObj.data);
                    } else if (chunkObj.type === 'tool-call') {
                      newMsg.toolCalls = [{
                        id: `tc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        toolName: chunkObj.toolName,
                        args: chunkObj.args,
                        status: 'pending',
                      }];
                    }

                    return [...prev, newMsg];
                  }

                  const updatedMsg = { ...lastMsg };
                  if (!updatedMsg.toolCalls) {
                    updatedMsg.toolCalls = [];
                  }

                  switch (chunkObj.type) {
                    case 'text':
                      updatedMsg.content = updatedMsg.content + String(chunkObj.data);
                      break;

                    case 'tool-call':
                      // Add a new tool call with stable ID
                      updatedMsg.toolCalls.push({
                        id: `tc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        toolName: chunkObj.toolName,
                        args: chunkObj.args,
                        status: 'pending',
                      });
                      break;

                    case 'tool-result':
                      // Match tool result to the correct tool call by ID or name
                      if (updatedMsg.toolCalls && updatedMsg.toolCalls.length > 0) {
                        const toolCallId = chunkObj.toolCallId;
                        const toolName = chunkObj.toolName;

                        // Try to match by toolCallId first (most reliable)
                        let matchingToolCall = updatedMsg.toolCalls.find(
                          (tc: any) => tc.id === toolCallId
                        );

                        // If no toolCallId, try matching by toolName of pending calls
                        // But prefer the first pending call to avoid wrong matches
                        if (!matchingToolCall && toolName) {
                          const pendingToolCalls = updatedMsg.toolCalls.filter(
                            (tc: any) => tc.status === 'pending'
                          );

                          // Find the first tool call matching the toolName
                          matchingToolCall = pendingToolCalls.find(
                            (tc: any) => tc.toolName === toolName
                          );
                        }

                        // Last resort: if still no match and there's a pending call, use the oldest pending
                        if (!matchingToolCall) {
                          matchingToolCall = updatedMsg.toolCalls.find(
                            (tc: any) => tc.status === 'pending'
                          );
                        }

                        if (matchingToolCall) {
                          matchingToolCall.result = chunkObj.data;
                          matchingToolCall.status = 'completed';
                        }
                      }
                      break;
                  }

                  return [...prev.slice(0, -1), updatedMsg];
                });
              } catch (parseError) {
                // If chunk is not JSON, treat as text
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + chunk }];
                  } else {
                    return [...prev, {
                      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                      role: 'assistant' as const,
                      content: chunk,
                      mode,
                      toolCalls: []
                    }];
                  }
                });
              }
            },
            () => resolve(),
            (error) => reject(new Error(error))
          );
        });
      } else {
        // Web mode: use Gemini with browser automation tools
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          role: 'assistant',
          content: '',
          mode,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        let fullText = '';

        await streamWithGemini(
          userMessage.content,
          messages,
          settings,
          (chunk) => {
            fullText += chunk;

            // Split by double newlines to create separate bubbles
            const paragraphs = fullText.split('\n\n').filter((p) => p.trim());

            setMessages((prev) => {
              // Start from the user message and rebuild assistant messages
              const userMsgIndex = prev.findIndex((m) => m.role === 'user' && m.content === userMessage.content);
              if (userMsgIndex === -1) return prev;

              const beforeUser = prev.slice(0, userMsgIndex + 1);

              // Split by double newlines AND by "Action completed successfully" marker
              let allSegments: string[] = [];
              for (const para of paragraphs) {
                const parts = para.split('Action completed successfully');
                for (let i = 0; i < parts.length; i++) {
                  const part = parts[i].trim();
                  if (part) {
                    allSegments.push(part);
                  }
                  // Add the marker as its own message if it exists
                  if (i < parts.length - 1) {
                    allSegments.push('Action completed successfully');
                  }
                }
              }

              const assistantMessages: Message[] = allSegments
                .filter((seg) => seg.trim())
                .map((seg, idx) => ({
                  id: `msg-${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}`,
                  role: 'assistant' as const,
                  content: seg.trim(),
                  mode: mode as 'chat' | 'web',
                  timestamp: Date.now(),
                }));

              return [...beforeUser, ...assistantMessages];
            });
          },
          abortControllerRef.current.signal,
          mode
        );
      }
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Check if error is from user abort (AbortError or DOMException)
      const isUserAbort = errorObj.name === 'AbortError' ||
                          (errorObj instanceof Error && errorObj.constructor.name === 'DOMException');

      // Only show error to user if it's not from user action
      if (!isUserAbort) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-error-${Math.random().toString(36).substring(7)}`,
            role: 'assistant' as const,
            content: `Error: ${errorObj.message}`,
            mode,
            toolCalls: [],
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);

      // Also tell main process to stop the computer use stream
      try {
        await window.electronAPI.stopComputerUse();
      } catch (error) {
        // Silently ignore errors when stopping stream
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes dot-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#ffffff' }}>
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: isSidebarLayout ? '100%' : '800px', padding: isSidebarLayout ? '20px 16px' : '40px 20px' }}>
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
              }}
            >
              <h1 style={{
                fontSize: '36px',
                fontWeight: 400,
                color: '#1a1a1a',
                marginBottom: '0',
                letterSpacing: '-0.5px',
              }}>
                What's on the agenda today?
              </h1>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    width: '100%',
                  }}
                >
                  {/* Tool Calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {msg.toolCalls.map((toolCall) => (
                        <ToolCallComponent key={toolCall.id} toolCall={toolCall} />
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  {msg.content && (
                    <div style={{
                      fontSize: '15px',
                      lineHeight: '1.7',
                      color: '#1a1a1a',
                      backgroundColor: msg.role === 'user' ? '#f5f5f5' : 'transparent',
                      padding: msg.role === 'user' ? '12px 16px' : '0',
                      borderRadius: msg.role === 'user' ? '12px' : '0',
                      maxWidth: msg.role === 'user' ? '70%' : 'none',
                      width: msg.role === 'user' ? 'auto' : '100%',
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <LinkComponent href={href} onOpenBrowser={onLinkClick}>
                              {children}
                            </LinkComponent>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  color: '#999',
                  fontSize: '15px',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#999',
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                    }} />
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#999',
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.2s',
                    }} />
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#999',
                      animation: 'dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: '0.4s',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: messages.length === 0 ? '0' : isSidebarLayout ? '0 16px 16px 16px' : '0 24px 24px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: messages.length === 0 ? 'center' : 'flex-start',
          backgroundColor: '#ffffff',
          position: messages.length === 0 ? 'absolute' : 'relative',
          bottom: messages.length === 0 ? '100px' : 'auto',
          left: 0,
          right: 0,
        }}
      >
        <div style={{ width: '100%', maxWidth: isSidebarLayout ? '100%' : '800px', position: 'relative' }}>
          {/* Control Icons - Only show in sidebar layout */}
          {isSidebarLayout && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '12px',
                paddingRight: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={onNewChat}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="New Chat"
              >
                +
              </button>
              <button
                onClick={onOpenSettings}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6"></path>
                  <path d="M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24"></path>
                </svg>
              </button>
            </div>
          )}

          {/* Input bar - Two rows */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
            borderRadius: '28px',
            border: '1px solid #e5e5e5',
          }}>
            {/* First row - Input field */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: isSidebarLayout ? '10px 16px' : '12px 20px',
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      handleSend();
                    }
                  }
                }}
                placeholder="Ask anything"
                disabled={isLoading}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: isSidebarLayout ? '13px' : '15px',
                  color: '#1a1a1a',
                  fontFamily: 'inherit',
                }}
              />

              {isLoading ? (
                <button
                  onClick={handleStop}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    fontSize: '18px',
                    fontWeight: '600',
                  }}
                  title="Stop generation"
                >
                  ⬛
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '8px 12px',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: input.trim() ? '#1a1a1a' : '#ccc',
                    fontSize: '18px',
                    fontWeight: '600',
                  }}
                  title="Send message"
                >
                  ⏎
                </button>
              )}
            </div>

            {/* Second row - Dropdown and Mode chip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: isSidebarLayout ? '6px 16px 10px 16px' : '8px 20px 12px 20px',
              gap: '8px',
              borderTop: '1px solid #e5e5e5',
            }}>
              {/* Plus button with dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '18px',
                  }}
                  title="Select mode"
                >
                  +
                </button>

                {/* Dropdown menu */}
                {showModeDropdown && (
                  <div style={{
                    position: 'absolute',
                    bottom: '110%',
                    left: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    minWidth: '200px',
                    padding: '8px 0',
                    zIndex: 1000,
                  }}>
                    <button
                      onClick={() => {
                        setSelectedMode('chat');
                        setShowModeDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: selectedMode === 'chat' ? '#f5f5f5' : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMode('browser');
                        setShowModeDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: selectedMode === 'browser' ? '#f5f5f5' : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span>Browser</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selected mode chip */}
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                fontSize: '12px',
                color: '#2196F3',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}>
                {selectedMode === 'chat' ? 'Chat' : 'Browser'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChatInterface;
