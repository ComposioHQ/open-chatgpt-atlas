import { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Settings from './components/Settings';
import NavBar from './components/NavBar';
import type { Message, Settings as SettingsType } from './types';
import { ChatHistorySchema, SettingsSchema } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMode, setCurrentMode] = useState<'chat' | 'web'>('chat');
  const [showBrowserSidebar, setShowBrowserSidebar] = useState(false);
  const [chatWidth, setChatWidth] = useState(40); // percentage
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Load settings and chat history on mount
  useEffect(() => {
    loadSettings();
    loadChatHistory();
  }, []);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getSetting('atlasSettings');
      if (savedSettings) {
        try {
          const validatedSettings = SettingsSchema.parse(savedSettings);
          setSettings(validatedSettings);
        } catch (validationError) {
          // Fall back to defaults if validation fails
          const defaultSettings: SettingsType = {
            googleApiKey: '',
            composioApiKey: '',
            model: 'gemini-2.0-flash-exp',
          };
          setSettings(defaultSettings);
        }
      } else {
        // Default settings
        const defaultSettings: SettingsType = {
          googleApiKey: '',
          composioApiKey: '',
          model: 'gemini-2.0-flash-exp',
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadChatHistory = () => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          const validatedMessages = ChatHistorySchema.parse(parsedMessages);
          setMessages(validatedMessages);
        } catch (validationError) {
          // If validation fails, start with empty chat history
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const saveChatHistory = (messagesToSave: Message[]) => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsType) => {
    try {
      await window.electronAPI.setSetting('atlasSettings', newSettings);
      setSettings(newSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleModeChange = async (mode: 'chat' | 'web') => {
    setCurrentMode(mode);

    if (mode === 'web') {
      await window.electronAPI.showBrowserView();
    } else {
      await window.electronAPI.hideBrowserView();
      setShowBrowserSidebar(false);
    }
  };

  const toggleBrowserSidebar = async () => {
    const newState = !showBrowserSidebar;
    setShowBrowserSidebar(newState);

    if (newState) {
      await window.electronAPI.showBrowserView();
    } else {
      await window.electronAPI.hideBrowserView();
    }
  };

  const handleLinkClick = async (url: string) => {
    // Show browser sidebar if not already visible
    if (!showBrowserSidebar) {
      setShowBrowserSidebar(true);
      await window.electronAPI.showBrowserView();
    }

    // Navigate to the URL
    try {
      await window.electronAPI.navigateToUrl(url);
      updateNavigationState();
    } catch (error) {
      console.error('Failed to navigate to URL:', error);
    }
  };

  const updateNavigationState = async () => {
    try {
      const state = await window.electronAPI.getBrowserNavState();
      if (state.success) {
        setCanGoBack(state.canGoBack ?? false);
        setCanGoForward(state.canGoForward ?? false);
      }
    } catch (error) {
      console.error('Failed to get browser nav state:', error);
    }
  };

  const handleBrowserBack = async () => {
    try {
      await window.electronAPI.browserBack();
      updateNavigationState();
    } catch (error) {
      console.error('Failed to go back:', error);
    }
  };

  const handleBrowserForward = async () => {
    try {
      await window.electronAPI.browserForward();
      updateNavigationState();
    } catch (error) {
      console.error('Failed to go forward:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
  };

  const handleOpenSettings = async () => {
    // Close browser sidebar if it's open
    if (showBrowserSidebar) {
      setShowBrowserSidebar(false);
      await window.electronAPI.hideBrowserView();
    }
    setShowSettings(true);
  };

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(25, Math.min(75, startWidth + (diff / windowWidth) * 100));
      setChatWidth(newWidth);

      // Update browser view bounds
      window.electronAPI.resizeBrowserView(newWidth).catch(error => {
        console.error('Failed to resize browser view:', error);
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (showSettings) {
    return (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Settings
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  const chatWidthPercent = showBrowserSidebar && currentMode === 'chat' ? chatWidth : (currentMode === 'web' ? 40 : 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: `${chatWidthPercent}%`,
        backgroundColor: '#ffffff',
        transition: showBrowserSidebar && currentMode === 'chat' ? 'none' : 'width 0.3s ease',
        position: 'relative',
      }}
    >
      {/* Draggable divider - only show when browser sidebar is open in chat mode */}
      {showBrowserSidebar && currentMode === 'chat' && (
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            position: 'fixed',
            right: `calc(${100 - chatWidthPercent}% - 4px)`,
            top: 0,
            width: '8px',
            height: '100vh',
            cursor: 'col-resize',
            backgroundColor: '#e5e5e5',
            zIndex: 999,
            transition: 'right 0s',
          }}
          title="Drag to resize"
        />
      )}

      {/* Navigation Bar */}
      <NavBar
        onNewChat={handleNewChat}
        showBrowserSidebar={showBrowserSidebar}
        onToggleBrowser={toggleBrowserSidebar}
        onBrowserBack={handleBrowserBack}
        onBrowserForward={handleBrowserForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        currentMode={currentMode}
        onOpenSettings={handleOpenSettings}
      />

      {/* Chat Interface */}
      <ChatInterface
        messages={messages}
        setMessages={setMessages}
        settings={settings}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        isSidebarLayout={showBrowserSidebar && currentMode === 'chat'}
        onNewChat={handleNewChat}
        onOpenSettings={handleOpenSettings}
        onLinkClick={handleLinkClick}
      />
    </div>
  );
}

export default App;
