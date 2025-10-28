<div align="center">

# Open ChatGPT Atlas

Free Alternative to ChatGPT Atlas.

![Atlas Demo](./atlas.gif)

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=GoogleChrome)](https://chrome.google.com/webstore)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-4285F4?logo=google)](https://ai.google.dev/)
[![Composio](https://img.shields.io/badge/Composio-500%2B%20Tools-FF6B6B)](https://composio.dev)


</div>

## Features

- **🔧 Tool Router Mode**: Composio's intelligent tool routing for accessing Gmail, Slack, GitHub, and 500+ integrations
- **◉ Browser Tools Mode**: Gemini 2.5 Computer Use for visual browser automation with screenshots, clicks, typing, scrolling, and navigation
- **Sidebar Chat Interface**: Clean, modern React-based chat UI accessible from any tab
- **Direct Browser Automation**: No backend required - all API calls made directly from extension
- **Visual Feedback**: Blue click indicators and element highlighting during automation
- **Smart Coordinate Scaling**: Automatically scales Gemini's 1000x1000 coordinate system to actual viewport dimensions
- **Safety Features**: Confirmation dialogs for sensitive actions (checkout, payment, etc.)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome or Edge browser (Manifest V3 support)
- Google API key for Gemini (required)
- Composio API key (optional, for Tool Router mode)

### Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `dist` folder
   - Open Settings (⚙️ icon) to configure your API keys

### Configuration

#### Required Setup

1. **Google API Key** (Required)
   - Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Add it in Settings under "Google API Key"
   - Supports: Gemini 2.5 Pro, Flash, and Flash Lite

2. **Composio API Key** (Optional - for Tool Router mode)
   - Get your key from [Composio Dashboard](https://app.composio.dev/settings)
   - Add it in Settings under "Composio API Key"
   - Enables access to 500+ app integrations

#### Using Browser Tools (◉ Button)

1. Enable Browser Tools by clicking the ◉ button in the chat header
2. The extension automatically uses Gemini 2.5 Computer Use Preview
3. Provide natural language instructions to control the browser

**Example prompts:**
- "Navigate to reddit.com and scroll down"
- "Click on the search box and type 'puppies'"
- "Take a screenshot of this page"
- "Click the first image on the page"

#### Using Tool Router Mode

1. Add your Composio API key in Settings
2. Click ◉ to disable Browser Tools (or keep it off)
3. Chat normally - the AI will automatically use Composio tools when needed

**Example prompts:**
- "Check my Gmail for unread messages"
- "Create a GitHub issue titled 'Bug in login flow'"
- "Send a Slack message to #general with 'Hello team!'"

### Development

Run with hot reload:
```bash
npm run dev
```

Then reload the extension in Chrome after each change.
# FAQ Content for README.md

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Stream API is not responding when using a proxy?

**A:** The extension has been updated to be compatible with proxy environments. If you encounter issues:
1. Make sure you're using the latest version
2. Check browser console for error messages (F12 → Console tab)
3. Try refreshing the extension (chrome://extensions → Reload)
4. Recommended proxies: mihomo/Clash, V2Ray with US nodes (Los Angeles, New York)

---

### Q: Browser Tools shows "Quota exceeded" error?

**A:** This is NOT a quota issue! This error means your API key doesn't have access to Computer Use models.

**Why this happens:**
- Browser Tools requires `gemini-2.5-computer-use-preview` model
- This is an experimental Google feature with limited access
- Most free API keys don't have this permission yet

**What you can do:**
1. **Use Tool Router mode instead**:
   - Get a Composio API key (free tier available)
   - Configure it in Settings
   - Access 500+ app integrations (Gmail, Slack, GitHub, etc.)

2. **Wait for Google to open access**:
   - Computer Use is in preview/experimental phase
   - Expected to be available to more users in 2025

3. **Use regular chat features**:
   - AI conversations work normally
   - Browser history search works
   - All features except Browser Tools are available

---

### Q: How to use this extension in mainland China?

**A:** You need a proxy to access Google APIs:

**Recommended setup:**
- Proxy software: mihomo/Clash, V2Ray
- Recommended nodes: US West Coast (Los Angeles), US East Coast (New York), Japan (Tokyo)
- Protocol: Ensure HTTP/HTTPS proxy is enabled

**Testing your connection:**
- Visit: https://generativelanguage.googleapis.com/
- Should not show connection error

---

### Q: What's the difference between Tool Router and Browser Tools?

**A:** They're completely different approaches:

**Tool Router** (Works for most users):
- Calls application APIs directly (Gmail API, Slack API, etc.)
- Fast and reliable
- Requires: Composio API key
- Supports: 500+ apps with APIs
- **Can't**: Control any random website

**Browser Tools** (Limited access):
- Controls browser like a human (screenshots, clicks, typing)
- Slower but more versatile
- Requires: Computer Use model permission
- Supports: Any website you can see
- **Can't**: Use without special permission

**Example:**
- Sending Gmail: Both can do it (Tool Router is faster)
- Operating a forum without API: Only Browser Tools can do it

---

### Q: Why does my API key work in Google AI Studio but not here?

**A:** Check these possibilities:

1. **Network issue**: Extension can't reach Google API
   - Solution: Use proxy, check firewall settings

2. **Different quota limits**: Extension and AI Studio may have separate rate limits
   - Solution: Wait for quota reset (daily at UTC 00:00)

3. **Stream API vs regular API**: Extension uses streaming which may have different behavior
   - Solution: Check browser console for specific errors

---

### Q: Can I use Claude or OpenAI instead of Gemini?

**A:** Currently, the extension only supports Google Gemini models.

The code includes AI SDK with Claude/OpenAI support, but the UI only implements Gemini integration.

If you'd like to add support for other providers, contributions are welcome!

---

### Q: Is my API key secure?

**A:** Yes, your API keys are stored locally:
- Saved in Chrome's local storage
- Never sent to any third-party servers
- Only used to communicate directly with Google/Composio APIs
- You can verify by checking the code (open source)

---

### Q: Where can I get help?

**A:** Multiple options:

1. **GitHub Issues**: https://github.com/ComposioHQ/open-chatgpt-atlas/issues
2. **Check TROUBLESHOOTING.md** for detailed diagnostic steps
3. **Browser Console**: Press F12 → Console tab for error details
4. **Composio Documentation**: https://docs.composio.dev/

---

## 🔧 Quick Troubleshooting

**Extension loads but shows no response:**
- Check API key is configured in Settings
- Check network connection (proxy if needed)
- Look at browser console for errors

**"Failed to fetch" error:**
- Network connectivity issue
- Try different proxy node
- Check if Google API is accessible

**Computer Use features not working:**
- This is expected - requires special model access
- Use Tool Router mode instead

---

**For more detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

## How It Works - Deep Dive

### Architecture Overview

Atlas consists of three main components that work together:

```
┌─────────────────┐
│  sidepanel.tsx  │  ← React UI with chat interface
│  (React UI)     │  
└────────┬────────┘
         │
         ↓ Messages
┌─────────────────┐
│  background.ts  │  ← Service worker (screenshots, navigation)
│  (Service       │
│   Worker)       │
└────────┬────────┘
         │
         ↓ Execute actions
┌─────────────────┐
│   content.ts    │  ← Content script (DOM manipulation)
│  (Injected      │
│   on all tabs)  │
└─────────────────┘
```

### Component Details

#### 1. Sidepanel (sidepanel.tsx) - The Brain

The main React component handles:

**Browser Tools Mode (`streamWithGeminiComputerUse`):**
- Takes initial screenshot of current page
- Sends screenshot + conversation history to Gemini 2.5 Computer Use
- Receives function calls (click, type, navigate, scroll, etc.)
- Executes actions via `executeBrowserAction()`
- Re-takes screenshot after each action
- Scales coordinates from Gemini's 1000x1000 grid to actual viewport
- Supports up to 30 turns of action-response loops
- Shows visual feedback in UI

**Tool Router Mode (`streamWithAISDKAndMCP`):**
- Connects to Composio's MCP (Model Context Protocol) server
- Uses Vercel AI SDK for streaming responses
- Auto-discovers and calls tools via MCP
- Manages MCP client lifecycle and session persistence

**Key Functions:**
- `executeTool()` - Sends message to background script to perform browser actions
- `scaleCoordinates()` - Converts Gemini coordinates to viewport coordinates
- `executeBrowserAction()` - Maps Gemini function names to actual browser actions
- `requiresUserConfirmation()` - Safety checks for sensitive actions
- `loadSettings()` - Manages Composio session initialization

#### 2. Background Script (background.ts) - The Bridge

The service worker provides:

**Screenshot Functionality:**
- Captures visible tab using `chrome.tabs.captureVisibleTab()`
- Auto-handles restricted pages (chrome://, about:, etc.) by navigating to Google.com
- Filters for actual visible tabs (not devtools or hidden windows)
- Returns data URL for screenshot

**Action Execution:**
- Relays commands from sidepanel to content script
- Ensures content script is injected before execution
- Handles tab targeting and message passing

**Browser APIs:**
- Gets browser history
- Manages bookmarks
- Navigates tabs
- Tracks recent pages for memory

**Key Message Types:**
- `TAKE_SCREENSHOT` - Capture current tab
- `GET_PAGE_CONTEXT` - Extract page metadata
- `EXECUTE_ACTION` - Run browser action (click, type, etc.)
- `NAVIGATE` - Change page URL
- `GET_HISTORY` - Fetch browsing history

#### 3. Content Script (content.ts) - The Hands

Injected into every webpage to:

**Extract Page Context:**
- URL, title, text content
- Links, images, forms
- Viewport dimensions (width, height, scroll position)
- Metadata (description, keywords, author)

**Execute DOM Actions:**

**Click (`highlightElement()` + `executePageAction('click')`):**
- Can click by CSS selector OR by coordinates
- Dispatches full mouse event sequence (mousedown, mouseup, click)
- Shows blue pulsing animation at click location
- Highlights element with blue outline
- Returns element info for debugging

**Type (`keyboard_type` action):**
- Types character by character to simulate real keyboard input
- Works with regular inputs, textareas, and contenteditable elements
- Dispatches input/change events for React/Vue/Angular compatibility
- For `type_text_at`: clicks coordinates, waits for focus, clears existing text, then types

**Scroll:**
- Supports up/down by pixels
- Can scroll to top/bottom
- Can scroll element into view

**Navigate:**
- Uses `chrome.tabs.update()` to change URLs

**Special Actions:**
- `hover` - Mouse over at coordinates
- `drag_drop` - Drag from one point to another
- `key_combination` - Press keyboard shortcuts
- `clear_input` - Clear focused field

**Visual Feedback:**
- Blue outline on clicked elements
- Blue pulsing circle at click coordinates
- Animation automatically cleans up after 600ms

### Browser Tools Mode - Detailed Flow

When you enable Browser Tools (◉ button):

```
1. User sends message: "Navigate to reddit.com and scroll"
   ↓
2. sidepanel.tsx → streamWithGeminiComputerUse()
   ↓
3. Take initial screenshot via executeTool('screenshot')
   ↓
4. Send to Gemini 2.5 Computer Use with:
   - Screenshot as inline_data (base64 PNG)
   - Conversation history
   - System instruction with available functions
   ↓
5. Gemini responds with function call: navigate({url: "https://reddit.com"})
   ↓
6. executeBrowserAction() maps to executeTool('navigate')
   ↓
7. background.ts receives EXECUTE_ACTION message
   ↓
8. chrome.tabs.update() navigates to URL
   ↓
9. Wait 2.5 seconds for page to load
   ↓
10. Take new screenshot
    ↓
11. Send function_response back to Gemini:
    { url: "https://reddit.com", success: true, [screenshot] }
    ↓
12. Gemini calls scroll_down()
    ↓
13. Execute via content.ts → window.scrollBy()
    ↓
14. Take another screenshot
    ↓
15. Continue loop (up to 30 turns) until task complete
```

**Coordinate Scaling Explained:**

Gemini Computer Use uses normalized coordinates (0-1000 on both axes). Atlas automatically scales them:

```javascript
// Gemini returns: x=500, y=300 (in 1000x1000 space)
// Actual viewport: 1920x1080

scaledX = (500 / 1000) * 1920 = 960
scaledY = (300 / 1000) * 1080 = 324
```

This ensures clicks land in the right place regardless of screen size.

### Safety & Confirmation System

The extension has built-in safety checks:

**Always Requires Confirmation:**
- Keyboard combinations (Ctrl+A, Alt+Tab, etc.)

**Context-Aware Confirmation:**
- **Sensitive Pages:** Checkout, payment, login, admin pages
- **Sensitive Data:** Detecting passwords or credit cards being typed
- **Form Submissions:** When typing with `press_enter: true`

Confirmation appears as a browser dialog before executing the action.

### Tool Router Mode - MCP Integration

When Composio API key is provided:

```
1. initializeComposioToolRouter() creates session
   ↓
2. Gets MCP URLs (chat_session_mcp_url, tool_router_mcp_url)
   ↓
3. Connects to MCP via StreamableHTTPClientTransport
   ↓
4. Queries available tools: mcpClient.tools()
   ↓
5. Merges MCP tools with local tools (getBrowserHistory)
   ↓
6. Passes all tools to AI SDK: streamText({ tools: allTools })
   ↓
7. AI SDK orchestrates tool calls via MCP
   ↓
8. Composio executes integration actions
   ↓
9. Results streamed back to user
```

**Available Tools in Tool Router Mode:**
- **Composio Tools** - 500+ integrations (Gmail, Slack, GitHub, etc.)
- **getBrowserHistory** - Built-in browser history search

The MCP client persists across messages but is recreated on "New Chat" to refresh available tools.

### Settings & Persistence

**Chrome Storage (`chrome.storage.local`):**
- `atlasSettings` - API keys, model selection
- `composioSessionId` - Active Composio session
- `composioChatMcpUrl` - Chat MCP endpoint
- `composioToolRouterMcpUrl` - Tool Router MCP endpoint
- `extensionUserId` - Unique user ID for rate limiting
- `browserMemory` - Recent pages, preferences

**Session Management:**
- Composio sessions expire after 24 hours
- New chat resets session to refresh tools
- Session automatically recreated if expired

### Browser History Access

When using Tool Router mode (with Composio API key), the agent has access to a built-in `getBrowserHistory` tool that allows it to search through your browsing history.

**Tool Features:**
- **Search by keyword** - Filter history by page title or URL
- **Time range** - Default searches last 7 days, configurable
- **Result limit** - Default returns 20 results, adjustable

**Example Usage:**
- "What GitHub repositories did I visit this week?"
- "Find the Reddit post I looked at yesterday"
- "Show me recent news articles I read"
- "What programming tutorials did I visit last month?"

The tool respects Chrome's history permissions and only accesses data you've already stored in your browser history.

## Project Structure

```
atlas/
├── sidepanel.tsx        # Main React component (1426 lines)
│   ├── Browser Tools mode with Gemini Computer Use
│   ├── Tool Router mode with MCP
│   ├── Message parsing with React Markdown
│   └── Coordinate scaling and safety checks
│
├── content.ts           # Content script (714 lines)
│   ├── Page context extraction
│   ├── DOM manipulation (click, type, scroll)
│   ├── Visual feedback (blue click indicators)
│   └── Keyboard simulation
│
├── background.ts        # Service worker (302 lines)
│   ├── Screenshot capture
│   ├── Tab navigation
│   ├── Browser history
│   └── Message routing
│
├── settings.tsx        # Settings page (163 lines)
│   └── API key configuration UI
│
├── tools.ts            # Composio integration (68 lines)
│   └── MCP session management
│
├── types.ts            # TypeScript definitions (271 lines)
│   ├── Zod schemas for validation
│   └── Interface definitions
│
├── manifest.json       # Extension manifest (Manifest V3)
│   ├── Permissions (tabs, history, bookmarks, etc.)
│   └── Content script injection
│
└── vite.config.ts      # Build configuration
```

## Technologies Used

- **React 18** - UI framework with hooks
- **TypeScript** - Type safety
- **Vite** - Build tool and bundler
- **Vercel AI SDK** - Streaming AI responses
- **React Markdown** - Markdown rendering
- **Zod** - Runtime validation
- **Chrome Extension APIs** - Manifest V3
- **Google Gemini API** - AI models (2.5 Pro/Flash/Lite/Computer Use)
- **Composio MCP** - Tool Router integration
- **StreamableHTTPClientTransport** - MCP transport

## Advanced Features

### Visual Feedback System

When clicking on a page:
1. Blue outline appears around element (3px solid #007AFF)
2. Light blue background highlight (rgba(0, 122, 255, 0.1))
3. Pulsing circle animation at click coordinates
4. All effects auto-remove after 600ms

### Keyboard Typing Simulation

The `keyboard_type` action:
- Types character-by-character
- Dispatches keydown, keypress, keyup for each char
- Triggers input/change events for React compatibility
- Works with INPUT, TEXTAREA, and contenteditable elements

### Error Handling & Retries

- Screenshots have retry logic (3 attempts with 1.5s delays)
- Connection errors automatically retry
- Graceful fallbacks for missing elements
- Detailed error messages in UI

## Contributing

Contributions welcome! Please:
1. Open an issue first to discuss changes
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

## References

- [Composio Tool Router Documentation](https://docs.composio.dev/docs/tool-router/quick-start) - Learn how to use Tool Router to route tool calls across 500+ integrations
- [Composio Platform](https://composio.dev) - Intelligent tool routing for AI agents
- [Composio GitHub](https://github.com/composiohq) - Python and TS SDK
- [ChatGPT Atlas](https://openai.com/index/introducing-chatgpt-atlas/) - OpenAI's browser automation AI agent
- [Gemini Computer Use Model](https://blog.google/technology/google-deepmind/gemini-computer-use-model/) - Google's AI model for browser automation
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/computer-use) - Official documentation for Gemini Computer Use

## License

MIT
