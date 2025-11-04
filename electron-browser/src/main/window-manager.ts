import { BrowserWindow } from 'electron';
import { join } from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private isDev: boolean;

  constructor(isDev: boolean) {
    this.isDev = isDev;
  }

  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 20, y: 20 },
      backgroundColor: '#1a1a1a',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Disabled for native module support (ComputerUseService requires BrowserView access)
        webSecurity: true, // Enabled for CORS protection - prevents unauthorized cross-origin requests
      },
    });

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
