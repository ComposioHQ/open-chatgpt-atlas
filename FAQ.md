# ❓ Frequently Asked Questions (FAQ)

## Q: Stream API is not responding when using a proxy?

**A:** The extension has been updated to be compatible with proxy environments. If you encounter issues:
1. Make sure you're using the latest version
2. Check browser console for error messages (F12 → Console tab)
3. Try refreshing the extension (chrome://extensions → Reload)
4. Recommended proxies: mihomo/Clash, V2Ray with US nodes (Los Angeles, New York)

---

## Q: Browser Tools shows "Quota exceeded" error?

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

## Q: How to use this extension in mainland China?

**A:** You need a proxy to access Google APIs:

**Recommended setup:**
- Proxy software: mihomo/Clash, V2Ray
- Recommended nodes: US West Coast (Los Angeles), US East Coast (New York), Japan (Tokyo)
- Protocol: Ensure HTTP/HTTPS proxy is enabled

**Testing your connection:**
- Visit: https://generativelanguage.googleapis.com/
- Should not show connection error

---

## Q: What's the difference between Tool Router and Browser Tools?

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

## Q: Why does my API key work in Google AI Studio but not here?

**A:** Check these possibilities:

1. **Network issue**: Extension can't reach Google API
   - Solution: Use proxy, check firewall settings

2. **Different quota limits**: Extension and AI Studio may have separate rate limits
   - Solution: Wait for quota reset (daily at UTC 00:00)

3. **Stream API vs regular API**: Extension uses streaming which may have different behavior
   - Solution: Check browser console for specific errors

---

## Q: Can I use Claude or OpenAI instead of Gemini?

**A:** Currently, the extension only supports Google Gemini models.

The code includes AI SDK with Claude/OpenAI support, but the UI only implements Gemini integration.

If you'd like to add support for other providers, contributions are welcome!

---

## Q: Is my API key secure?

**A:** Yes, your API keys are stored locally:
- Saved in Chrome's local storage
- Never sent to any third-party servers
- Only used to communicate directly with Google/Composio APIs
- You can verify by checking the code (open source)

---

## Q: Where can I get help?

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
