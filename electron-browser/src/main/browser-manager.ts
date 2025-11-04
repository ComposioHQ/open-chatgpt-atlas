import { BrowserWindow, BrowserView } from 'electron';

export class BrowserManager {
  private mainWindow: BrowserWindow;
  private browserView: BrowserView | null = null;
  private isWebModeActive: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Show the embedded browser view for web mode
   */
  showBrowserView() {
    if (!this.browserView) {
      this.createBrowserView();
    }

    if (this.browserView) {
      this.mainWindow.addBrowserView(this.browserView);
      this.updateBrowserViewBounds();
      this.isWebModeActive = true;
    }
  }

  /**
   * Hide the embedded browser view (chat mode)
   */
  hideBrowserView() {
    if (this.browserView) {
      this.mainWindow.removeBrowserView(this.browserView);
      this.isWebModeActive = false;
    }
  }

  /**
   * Create the browser view for web automation
   */
  private createBrowserView() {
    this.browserView = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        javascript: true,
      },
    });

    // Load initial page
    this.browserView.webContents.loadURL('https://www.google.com');

    // Handle navigation
    this.browserView.webContents.on('did-navigate', (event, url) => {
      this.mainWindow.webContents.send('browser-navigated', url);
    });

    this.browserView.webContents.on('did-navigate-in-page', (event, url) => {
      this.mainWindow.webContents.send('browser-navigated', url);
    });

    // Update bounds on window resize
    this.mainWindow.on('resize', () => {
      if (this.isWebModeActive) {
        this.updateBrowserViewBounds();
      }
    });
  }

  /**
   * Update browser view bounds to fit in the right side of window
   * Layout: [Chat Panel (X%)] [Browser View (100-X%)]
   */
  private updateBrowserViewBounds(chatWidthPercent: number = 40) {
    if (!this.browserView) return;

    const bounds = this.mainWindow.getBounds();
    const chatPanelWidth = Math.floor(bounds.width * (chatWidthPercent / 100));

    this.browserView.setBounds({
      x: chatPanelWidth,
      y: 0,
      width: bounds.width - chatPanelWidth,
      height: bounds.height,
    });
  }

  /**
   * Resize browser view based on chat panel width percentage
   */
  resizeBrowserView(chatWidthPercent: number) {
    this.updateBrowserViewBounds(chatWidthPercent);
  }

  /**
   * Navigate to a URL
   * SECURITY: Validates URL to prevent javascript: and other dangerous protocols
   */
  async navigateToUrl(url: string): Promise<void> {
    if (!this.browserView) {
      this.createBrowserView();
    }

    // SECURITY: Validate URL to prevent javascript: and data: protocol injection
    const validatedUrl = this.validateAndSanitizeUrl(url);
    if (!validatedUrl) {
      throw new Error('Invalid URL: Only http:// and https:// protocols are allowed');
    }

    await this.browserView?.webContents.loadURL(validatedUrl);
  }

  /**
   * Validates and sanitizes URLs to prevent malicious protocols
   * Only allows http:// and https://
   */
  private validateAndSanitizeUrl(url: string): string | null {
    try {
      // Remove whitespace
      url = url.trim();

      // If no protocol, assume https
      if (!url.includes('://')) {
        url = 'https://' + url;
      }

      // Parse URL to validate it
      const parsedUrl = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        console.error('[BrowserManager] Blocked navigation to URL with protocol:', parsedUrl.protocol);
        return null;
      }

      return parsedUrl.toString();
    } catch (error) {
      console.error('[BrowserManager] URL validation failed:', error);
      return null;
    }
  }

  /**
   * Go back in browser history
   */
  goBack(): boolean {
    if (!this.browserView) return false;
    if (this.browserView.webContents.canGoBack()) {
      this.browserView.webContents.goBack();
      return true;
    }
    return false;
  }

  /**
   * Go forward in browser history
   */
  goForward(): boolean {
    if (!this.browserView) return false;
    if (this.browserView.webContents.canGoForward()) {
      this.browserView.webContents.goForward();
      return true;
    }
    return false;
  }

  /**
   * Check if can go back
   */
  canGoBack(): boolean {
    return this.browserView?.webContents.canGoBack() ?? false;
  }

  /**
   * Check if can go forward
   */
  canGoForward(): boolean {
    return this.browserView?.webContents.canGoForward() ?? false;
  }

  /**
   * Capture screenshot of the browser view
   */
  async captureScreenshot(): Promise<string> {
    if (!this.browserView) {
      throw new Error('Browser view not initialized');
    }

    const image = await this.browserView.webContents.capturePage();
    return image.toDataURL();
  }

  /**
   * Execute JavaScript in the browser view
   */
  async executeScript(script: string): Promise<any> {
    if (!this.browserView) {
      throw new Error('Browser view not initialized');
    }

    return await this.browserView.webContents.executeJavaScript(script);
  }

  /**
   * Click at coordinates
   */
  async clickAt(x: number, y: number): Promise<void> {
    const script = `
      (function() {
        const element = document.elementFromPoint(${x}, ${y});
        if (element) {
          element.click();
          return { success: true, element: element.tagName };
        }
        return { success: false };
      })();
    `;

    return await this.executeScript(script);
  }

  /**
   * Type text into focused element
   * SECURITY: Uses JSON serialization to safely pass text to JavaScript
   */
  async typeText(text: string): Promise<void> {
    // SECURITY: Safely serialize text as JSON to prevent injection
    const encodedText = JSON.stringify(text);
    const script = `
      (function() {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable)) {
          activeElement.value = ${encodedText};
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true };
        }
        return { success: false };
      })();
    `;

    return await this.executeScript(script);
  }

  /**
   * Scroll the page
   */
  async scrollPage(direction: 'up' | 'down', amount: number = 300): Promise<void> {
    const scrollAmount = direction === 'down' ? amount : -amount;
    const script = `window.scrollBy(0, ${scrollAmount});`;
    await this.executeScript(script);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.browserView?.webContents.getURL() || '';
  }

  /**
   * Get page title
   */
  getPageTitle(): string {
    return this.browserView?.webContents.getTitle() || '';
  }

  /**
   * Get the browser view instance (for external services like ComputerUseService)
   */
  getBrowserView(): BrowserView | null {
    return this.browserView;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.browserView) {
      this.mainWindow.removeBrowserView(this.browserView);
      // @ts-ignore - webContents has destroy method
      this.browserView.webContents.destroy();
      this.browserView = null;
    }
  }
}
