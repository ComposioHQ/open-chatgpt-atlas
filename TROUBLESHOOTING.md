# 🔧 Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Open ChatGPT Atlas extension.

---

## 📋 Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

- [ ] Extension is loaded and enabled in `chrome://extensions/`
- [ ] Google API key is configured in Settings (⚙️ icon)
- [ ] Browser console is open (F12 → Console tab) to see error messages
- [ ] Extension has been reloaded after configuration changes
- [ ] Network connection is stable (check if you need a proxy)

---

## 🚨 Common Issues

### 1. Extension Shows No Response / Infinite Loading

**Symptoms:**
- You send a message but see only a loading indicator
- No AI response appears
- No error messages visible in UI

**Possible Causes & Solutions:**

#### A. API Key Not Configured
**Check:** Settings → Google API Key field is empty
**Solution:**
1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Paste it in Settings
3. Click Save
4. Reload the extension

#### B. Network Connectivity Issue (Proxy Required)
**Check:** You're in a region that blocks Google APIs (e.g., mainland China)
**Solution:**
1. Set up a proxy (mihomo/Clash, V2Ray, or similar)
2. Use US or Japan nodes for best reliability
3. Ensure HTTP/HTTPS proxy is enabled (not just SOCKS5)
4. Test by visiting: https://generativelanguage.googleapis.com/
5. You should see a JSON response, not a connection error

#### C. Stream API Compatibility Issue
**Check:** Browser console shows JSON parsing errors
**Solution:**
- Update to the latest version of the extension
- The latest version includes fallback parsing for proxy environments
- If still failing, try disabling any browser extensions that modify network requests

#### D. Rate Limit / Quota Exceeded
**Check:** Console shows "429" or "quota" errors
**Solution:**
- Google API has free tier limits (15 requests per minute, 1500 per day)
- Wait for quota reset (daily at UTC 00:00)
- Consider upgrading to paid tier if you need higher limits

---

### 2. "Quota Exceeded" Error with Browser Tools

**Symptoms:**
- Click the ◉ button to enable Browser Tools
- Immediately see error: `Quota exceeded for metric: generativelanguage.googleapis.com/...`
- Error appears without even sending a message

**Important:** This is NOT a quota issue!

**Real Cause:**
- Browser Tools requires the `gemini-2.5-computer-use-preview` model
- This is an experimental Google feature with limited access
- Your API key doesn't have permission to use Computer Use models
- This is a Google platform limitation, not an extension bug

**Solutions:**

#### Option 1: Use Tool Router Mode (Recommended)
1. Get a free Composio API key from [Composio Dashboard](https://app.composio.dev/settings)
2. Add it in Settings → Composio API Key
3. Keep Browser Tools disabled (◉ button OFF)
4. Chat normally - you'll have access to 500+ app integrations
5. Examples: Gmail, Slack, GitHub, Google Sheets, etc.

#### Option 2: Wait for Google to Open Access
- Computer Use is in preview/experimental phase
- Expected to be widely available in 2025
- Monitor [Google AI Studio](https://aistudio.google.com/) for updates

#### Option 3: Use Regular Chat Without Tools
- AI conversations work normally
- Browser history search works
- All features except Browser Tools are available
- Just keep the ◉ button OFF

---

### 3. API Key Works in Google AI Studio But Not in Extension

**Symptoms:**
- Your API key works fine on ai.google.dev
- Same key fails in the extension
- Different error messages or behavior

**Possible Causes & Solutions:**

#### A. Network Environment Difference
**Cause:** AI Studio uses different network paths than extension
**Solution:**
- Check if you need a proxy for the extension
- Try a different proxy node if already using one
- Test with a VPN to see if it's a regional issue

#### B. Stream API vs Standard API
**Cause:** Extension uses streaming API which may have different behavior
**Check:** Browser console for specific error messages
**Solution:**
- Update to latest extension version (includes better streaming support)
- Check if your API key has streaming permissions enabled

#### C. Different Rate Limits
**Cause:** Google may apply different quotas to web vs API usage
**Solution:**
- Wait 24 hours for quota reset
- Check Google Cloud Console for quota details
- Consider using different API keys for different use cases

---

### 4. "Failed to Fetch" Errors

**Symptoms:**
- Network errors in console
- `Failed to fetch` or `net::ERR_CONNECTION_REFUSED`
- Requests timeout

**Diagnostic Steps:**

1. **Test Google API Access:**
   ```
   Visit: https://generativelanguage.googleapis.com/
   Expected: JSON response (even if it's an error, that's fine)
   Bad: Connection timeout or "site can't be reached"
   ```

2. **Check Proxy Configuration:**
   - Is your proxy running?
   - Is the proxy set to system proxy mode?
   - Try switching proxy nodes (US West Coast often works best)

3. **Firewall / Antivirus:**
   - Check if your firewall is blocking Chrome extension API calls
   - Temporarily disable antivirus to test
   - Add exception for Chrome if needed

4. **Browser Settings:**
   - Check Chrome's proxy settings: `chrome://settings/system`
   - Ensure "Use system proxy settings" is enabled
   - Try clearing Chrome's cache and cookies

---

### 5. Extension UI Not Loading / Blank Sidebar

**Symptoms:**
- Sidebar opens but shows nothing
- White or blank screen
- No chat interface

**Solutions:**

#### A. Hard Reload Extension
1. Go to `chrome://extensions/`
2. Find "Open ChatGPT Atlas"
3. Click the refresh/reload icon
4. Close and reopen the sidebar

#### B. Clear Extension Storage
1. Open browser console (F12)
2. Go to Application tab → Storage
3. Expand "Local Storage"
4. Find the extension's storage
5. Clear all data
6. Reload extension
7. Reconfigure API keys

#### C. Check for JavaScript Errors
1. Open console (F12)
2. Look for red error messages
3. Common issues:
   - `Cannot read property of undefined` → Extension needs reload
   - `Failed to load resource` → Network issue
   - `Module not found` → Extension not fully installed

---

### 6. Tool Router Not Working

**Symptoms:**
- Composio API key is configured
- AI responds but doesn't use tools
- "Tool not found" errors

**Solutions:**

#### A. Verify API Key
1. Check Composio API key is correct
2. Key should start with specific prefix (check Composio dashboard)
3. Ensure no extra spaces when pasting

#### B. Check Tool Availability
1. Some tools require additional OAuth authentication
2. Visit [Composio Dashboard](https://app.composio.dev/)
3. Check "Connected Apps" section
4. Authenticate the apps you want to use (Gmail, Slack, etc.)

#### C. Session Refresh
1. Click "New Chat" to reset session
2. This refreshes available tools from Composio
3. Try your request again

---

### 7. Clicking / Typing Actions Not Working (Browser Tools)

**Symptoms:**
- AI says it's clicking but nothing happens
- Coordinates seem wrong
- Actions target wrong elements

**Solutions:**

#### A. Coordinate Scaling Issue
- The extension auto-scales coordinates from 1000x1000 to your viewport
- If your screen is very large/small, scaling might be off
- Try zooming browser to 100% (Ctrl+0)

#### B. Page Still Loading
- AI might act before page fully loads
- Try asking AI to "wait 3 seconds then click"
- Or: "refresh the page and wait for it to load"

#### C. Element Not Interactable
- Element might be hidden or covered
- Try: "scroll to make the button visible first"
- Check if page has overlays or modals blocking interaction

---

## 🌍 Region-Specific Issues

### Mainland China Users

**Required Setup:**
1. **Proxy is mandatory** - Google APIs are blocked
2. **Recommended proxies:**
   - mihomo (Clash Meta fork)
   - V2Ray / Xray
   - Shadowsocks (may be less stable)
3. **Best proxy nodes:**
   - US West Coast (Los Angeles, San Francisco) - lowest latency
   - US East Coast (New York) - good reliability
   - Japan (Tokyo) - fast but may have occasional blocks
   - Avoid: Hong Kong nodes (often blocked for Google APIs)
4. **Proxy mode:** Must support HTTP/HTTPS (not just SOCKS5)

**Testing Your Setup:**
```
1. Enable proxy
2. Visit: https://generativelanguage.googleapis.com/
3. Should see: JSON error message (this is good!)
4. Should NOT see: Connection timeout or "can't reach"
5. If timeout → try different proxy node
```

**Common Proxy Issues:**
- **Extension works but very slow:** Switch to US West Coast node
- **Intermittent failures:** Use backup proxy nodes
- **Works then stops:** Proxy node might be overloaded, switch nodes

---

### Other Regions with Restrictions

**Russia, Iran, etc.:**
- Similar setup to China (proxy required)
- Test with multiple proxy locations
- VPN might be more reliable than proxy in some cases

**Corporate Networks / University Firewalls:**
- May block WebSocket connections
- May block streaming APIs
- Contact IT department for whitelist:
  - `generativelanguage.googleapis.com`
  - `api.composio.dev`

---

## 🔍 Advanced Debugging

### Enable Detailed Logging

1. Open browser console (F12)
2. Look for messages prefixed with `[Atlas]` or `[Composio]`
3. Errors will show in red
4. Network requests visible in Network tab

### Check Extension Permissions

1. Go to `chrome://extensions/`
2. Click "Details" on Atlas extension
3. Scroll to "Permissions"
4. Should have: tabs, history, activeTab, sidePanel, scripting, storage
5. If any missing, reinstall extension

### Test API Key Directly

Test your Google API key with curl:
```bash
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY"
```

Expected: JSON response with AI-generated text
If fails: API key or network issue

### MCP Connection Debugging

For Tool Router issues:
1. Check console for MCP connection messages
2. Look for errors like "MCP transport failed"
3. Check Composio session is created (should see session ID in logs)
4. Try creating new session: click "New Chat"

---

## 🆘 Still Having Issues?

If you've tried everything above and still have problems:

### 1. Gather Information
Before asking for help, collect:
- Browser console logs (F12 → Console → screenshot or copy)
- Extension version (check `chrome://extensions/`)
- Browser version (check `chrome://version/`)
- Operating system
- Network environment (proxy, VPN, corporate network, etc.)
- Exact error messages
- Steps to reproduce

### 2. Check Existing Issues
Search [GitHub Issues](https://github.com/ComposioHQ/open-chatgpt-atlas/issues) to see if your issue is already reported

### 3. Create New Issue
If not found, create a new issue with:
- Clear title describing the problem
- All information from step 1
- What you've already tried
- Expected vs actual behavior

### 4. Community Support
- Check Composio documentation: https://docs.composio.dev/
- Join Composio Discord (link in their docs)
- Ask on GitHub Discussions

---

## 📊 Error Message Reference

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| `API key not valid` | Invalid Google API key | Get new key from AI Studio |
| `Quota exceeded` | Rate limit hit OR no Computer Use access | See section 2 above |
| `Failed to fetch` | Network connectivity issue | Check proxy/VPN/firewall |
| `Model not found` | Model name typo or not available | Check model name in Settings |
| `Invalid response format` | API returned unexpected data | Update extension to latest |
| `Session expired` | Composio session timed out | Click "New Chat" |
| `Tool not found` | Composio tool unavailable | Authenticate app in Composio Dashboard |
| `Permission denied` | Missing OAuth permissions | Connect app in Composio Dashboard |

---

## 🔄 Quick Fixes Summary

**Extension not responding:**
- Reload extension at `chrome://extensions/`
- Check API key is configured
- Open console to see errors

**Network errors:**
- Enable proxy if in restricted region
- Test: https://generativelanguage.googleapis.com/
- Try different proxy node

**Browser Tools not working:**
- This is expected for most users
- Use Tool Router mode instead
- Requires special Google permissions

**Tool Router issues:**
- Verify Composio API key
- Authenticate apps in Composio Dashboard
- Click "New Chat" to refresh session

---

**Last Updated:** October 2024
**For FAQ, see:** [FAQ.md](./FAQ.md)
**For general info, see:** [README.md](./README.md)
