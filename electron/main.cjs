const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

// Maintain single instance lock
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Sibham Enterprises - Inventory & Billing System',
    icon: iconPath,
    backgroundColor: '#0F172A',
    show: false, // show after ready-to-show to prevent flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permits direct API requests to remote backend without CORS restrictions
      allowRunningInsecureContent: false,
    },
  });

  // Intercept request headers to strip 'Origin: null' / 'file://' which triggers remote server 500 error
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    if (
      requestHeaders['Origin'] === 'null' ||
      requestHeaders['origin'] === 'null' ||
      requestHeaders['Origin'] === 'file://' ||
      requestHeaders['origin'] === 'file://'
    ) {
      delete requestHeaders['Origin'];
      delete requestHeaders['origin'];
    }
    callback({ requestHeaders });
  });

  // Ensure cross-origin headers allow communication with remote backend
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS, PATCH'];
    responseHeaders['Cross-Origin-Resource-Policy'] = ['cross-origin'];
    callback({ responseHeaders });
  });

  // Set native application menu
  setupApplicationMenu();

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const isTestMode = process.env.ELECTRON_TEST_MODE === '1' || process.argv.includes('--test');

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[ELECTRON] Page loaded successfully: ' + mainWindow.webContents.getURL());
    if (isTestMode) {
      console.log('[ELECTRON TEST SUCCESS] Electron launched and loaded page cleanly.');
      setTimeout(() => {
        app.quit();
      }, 1500);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[ELECTRON TEST FAILURE] Failed to load URL: ${validatedURL} (${errorCode}: ${errorDescription})`);
    if (isTestMode) {
      app.exit(1);
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 3) {
      console.error(`[BROWSER ERROR] ${message} (${sourceId}:${line})`);
    }
  });

  // Load the application
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load application index:', err);
    });
  }

  // Smooth appearance
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Sibham Enterprises Info',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sibham Enterprises',
              message: 'Sibham Enterprises - Inventory & Billing System',
              detail: 'Desktop Application connected to remote server.\nVersion: 1.0.0',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
