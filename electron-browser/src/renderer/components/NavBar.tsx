interface NavBarProps {
  onNewChat: () => void;
  showBrowserSidebar: boolean;
  onToggleBrowser: () => void;
  onBrowserBack: () => void;
  onBrowserForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  currentMode: 'chat' | 'web';
  onOpenSettings: () => void;
}

export default function NavBar({
  onNewChat,
  showBrowserSidebar,
  onToggleBrowser,
  onBrowserBack,
  onBrowserForward,
  canGoBack,
  canGoForward,
  currentMode,
  onOpenSettings,
}: NavBarProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e5e5',
        backgroundColor: '#fafafa',
        height: '52px',
        gap: '8px',
      }}
    >
      {/* Left side - Brand/Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>Atlas</span>
      </div>

      {/* Center - Browser Controls (only show in chat mode when browser is visible) */}
      {currentMode === 'chat' && showBrowserSidebar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onBrowserBack}
            disabled={!canGoBack}
            style={{
              padding: '6px 10px',
              backgroundColor: canGoBack ? '#f0f0f0' : 'transparent',
              color: canGoBack ? '#1a1a1a' : '#ccc',
              border: 'none',
              borderRadius: '6px',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: canGoBack ? 1 : 0.5,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Go Back"
          >
            ←
          </button>
          <button
            onClick={onBrowserForward}
            disabled={!canGoForward}
            style={{
              padding: '6px 10px',
              backgroundColor: canGoForward ? '#f0f0f0' : 'transparent',
              color: canGoForward ? '#1a1a1a' : '#ccc',
              border: 'none',
              borderRadius: '6px',
              cursor: canGoForward ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: canGoForward ? 1 : 0.5,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Go Forward"
          >
            →
          </button>
        </div>
      )}

      {/* Right side - Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
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
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            minHeight: '32px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
          title="New Chat"
        >
          ➕
        </button>

        {currentMode === 'chat' && (
          <button
            onClick={onToggleBrowser}
            style={{
              padding: '6px 10px',
              backgroundColor: showBrowserSidebar ? '#e5e5e5' : 'transparent',
              color: showBrowserSidebar ? '#1a1a1a' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: showBrowserSidebar ? 600 : 400,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              minHeight: '32px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = showBrowserSidebar
                ? '#e5e5e5'
                : '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = showBrowserSidebar
                ? '#e5e5e5'
                : 'transparent';
            }}
            title="Toggle Browser"
          >
            🌐
          </button>
        )}

        <button
          onClick={onOpenSettings}
          style={{
            padding: '6px 10px',
            backgroundColor: 'transparent',
            color: '#666',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            minHeight: '32px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6"></path>
            <path d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
          </svg>
        </button>
      </div>
    </nav>
  );
}
