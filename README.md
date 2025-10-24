# Atlas Browser Extension

A Chrome extension with an AI-powered sidebar chat that supports **Computer Use** and **Composio's Tool Router** for advanced browser automation and tool execution.

## Features

- **🖥️ Computer Use Mode**: Anthropic-powered browser automation with tools like screenshot, click, type, scroll, and navigation
- **🔧 Tool Router Mode**: Composio's intelligent tool routing system for accessing multiple integrations
- **Sidebar Chat Interface**: Clean, modern chat UI accessible from any tab
- **Multi-Provider Support**: Works with OpenAI, Anthropic, and Google AI models
- **Direct Browser Automation**: No backend required - all AI calls made directly from the extension

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome or Edge browser (Manifest V3 support)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your API keys:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Build the extension:
```bash
npm run build
```

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. Click the Atlas extension icon to open the sidebar
6. Click the settings icon (⚙️) to configure your API keys and tool mode

### Configuration

Atlas supports two tool modes:

#### 🖥️ Computer Use Mode
Uses Anthropic's Computer Use tools for direct browser automation. This mode provides the AI with tools to:
- Take screenshots of the current page
- Click on elements (by CSS selector or coordinates)
- Type text into input fields
- Scroll the page
- Navigate to URLs
- Extract page context (URL, title, content, links, forms)
- Access browser history and bookmarks

**Setup:**
1. Select **Anthropic** as your provider
2. Choose **Computer Use** as your tool mode
3. Enter your Anthropic API key
4. Select a Claude model (e.g., claude-3-5-sonnet-20241022)

**Example prompts:**
- "Take a screenshot of this page"
- "Click on the search button"
- "Fill in the email field with test@example.com"
- "Scroll down to see more content"

#### 🔧 Tool Router Mode
Uses [Composio's Tool Router](https://docs.composio.dev/docs/tool-router/quick-start) to intelligently select and execute tools from multiple integrations.

**Setup:**
1. Select any provider (OpenAI, Anthropic, or Google)
2. Choose **Tool Router** as your tool mode
3. Enter your Composio API key (get it from [Composio Dashboard](https://app.composio.dev/settings))
4. Enter your AI provider API key

The Tool Router will automatically discover and execute the best tools for your task.

### Development

Run the development server with hot reload:
```bash
npm run dev
```

Then follow the loading instructions above, but reload the extension after each change.

## Architecture

### Components

- **sidepanel.tsx**: Main React component for the chat interface with streaming AI responses and tool execution
- **settings.tsx**: Configuration page for API keys, model selection, and tool mode
- **background.ts**: Service worker handling extension lifecycle, message routing, and tool execution
- **content.ts**: Content script that runs on all pages to extract context and execute browser actions
- **tools.ts**: Tool definitions for Computer Use and Composio Tool Router integration
- **types.ts**: Shared TypeScript types

### How It Works

1. **Chat Interface**: User sends a message through the sidebar
2. **API Call**: Extension makes a direct API call to the selected AI provider (OpenAI, Anthropic, or Google)
3. **Tool Use** (Computer Use mode only):
   - AI can request to use tools (screenshot, click, type, etc.)
   - Extension executes the tool via background script and content script
   - Tool results are sent back to the AI
   - AI continues the conversation with the tool results
4. **Response Streaming**: AI responses are streamed back to the user in real-time

### Tool Execution Flow

**Computer Use Mode (Anthropic):**
```
User Message → Anthropic API (with tools) → Tool Use Request → 
Background Script → Content Script → Execute Action → Tool Result → 
Anthropic API (with result) → Final Response → User
```

**Tool Router Mode (Composio):**
```
User Message → AI API → Background Script → Composio Tool Router → 
Execute Tool → Tool Result → AI API → Response → User
```

## Project Structure

```
atlas/
├── sidepanel.html       # Sidebar HTML entry point
├── sidepanel.tsx        # React chat component with AI streaming
├── sidepanel.css        # Sidebar styling
├── settings.html        # Settings page entry point
├── settings.tsx         # Settings configuration component
├── settings.css         # Settings styling
├── background.ts        # Extension service worker
├── content.ts           # Content script for page interaction
├── tools.ts             # Tool definitions and execution
├── types.ts             # Shared TypeScript types
├── manifest.json        # Extension manifest (Manifest V3)
├── vite.config.ts       # Build configuration
└── api/chat/route.ts    # Example API route (not used in browser extension)
```

## Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Chrome Extension APIs**: Manifest V3
- **Anthropic API**: Claude models with tool use
- **Composio SDK**: Tool Router integration
- **OpenAI/Google APIs**: Additional model support

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT
