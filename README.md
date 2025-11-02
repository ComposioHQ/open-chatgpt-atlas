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

## Documentation

- **[FAQ](./FAQ.md)** - Frequently asked questions and quick troubleshooting
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Detailed troubleshooting guide for common issues

