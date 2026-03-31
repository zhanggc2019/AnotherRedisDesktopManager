// Modules to control application life and create native browser window
const {
  app, BrowserWindow, Menu, ipcMain, dialog, nativeTheme,
} = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const winState = require('../../pack/electron/win-state');

// disable GPU for some white screen issues
// app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu');

global.APP_ENV = (process.env.NODE_ENV === 'development' || process.env.ARDM_ENV === 'development') ? 'development' : 'production';
const { APP_ENV } = global;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// handle uncaught exception
process.on('uncaughtException', (err, _origin) => {
  if (!err) {
    return;
  }

  // Log to console first
  console.error('Uncaught Exception:', err.stack);

  // Only show dialog if app is ready
  if (app.isReady() && mainWindow) {
    dialog.showMessageBoxSync(mainWindow, {
      type: 'error',
      title: 'Whoops! Uncaught Exception',
      message: err.stack,
      detail: '\nDon\'t worry, I will fix it! 😎😎\n\n'
              + 'Submit issue to: \nhttps://github.com/qishibo/AnotherRedisDesktopManager/',
    });
  }

  process.exit();
});

// auto update
if (APP_ENV === 'production') {
  require('../../pack/electron/update')();
}

/**
 * 构建开发环境 renderer URL，使用 electron-vite 注入地址并附加应用查询参数。
 *
 * @returns {string} 可直接传给 BrowserWindow.loadURL 的地址
 */
function getDevRendererUrl() {
  const base = process.env.ELECTRON_RENDERER_URL || 'http://localhost:9988';
  const target = new URL(base);
  target.searchParams.set('version', app.getVersion());
  target.searchParams.set('dark', String(nativeTheme.shouldUseDarkColors));
  return target.toString();
}

function createWindow() {
  // get last win stage
  const lastWinStage = winState.getLastState();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: lastWinStage.x,
    y: lastWinStage.y,
    width: lastWinStage.width,
    height: lastWinStage.height,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(__dirname, '../../pack/electron/icons/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Normalize baseline zoom to avoid persisted Chromium per-origin zoom side effects.
  mainWindow.webContents.setZoomFactor(1);
  if (typeof mainWindow.webContents.setVisualZoomLevelLimits === 'function') {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  }

  winState.watchClose(mainWindow);

  // and load the index.html of the app.
  if (APP_ENV === 'production') {
    // mainWindow.loadFile('index.html');
    mainWindow.loadURL(url.format({
      protocol: 'file',
      pathname: path.join(__dirname, '../renderer/index.html'),
      query: { version: app.getVersion(), dark: nativeTheme.shouldUseDarkColors },
    }));
  } else {
    mainWindow.loadURL(getDevRendererUrl());
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on('close', () => {
    mainWindow.webContents.send('closingWindow');
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // const contents = mainWindow.webContents;
  // // contents.openFindWindow();
  // contents.findInPage('133');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Load font manager after app is ready
  require('../../pack/electron/font-manager');
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit();
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// hide window
ipcMain.on('hideWindow', () => {
  mainWindow && mainWindow.hide();
});
// minimize window
ipcMain.on('minimizeWindow', () => {
  mainWindow && mainWindow.minimize();
});
// toggle maximize
ipcMain.on('toggleMaximize', () => {
  if (mainWindow) {
    // restore failed on MacOS, use unmaximize instead
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.handle('getMainArgs', (_event, _arg) => ({
  argv: process.argv,
  version: app.getVersion(),
}));

ipcMain.handle('changeTheme', (_event, theme) => {
  nativeTheme.themeSource = theme;
  return nativeTheme.shouldUseDarkColors;
});

// OS theme changed
nativeTheme.on('updated', () => {
  // delay send to prevent webcontent stuck
  setTimeout(() => {
    mainWindow.webContents.send('os-theme-updated', {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource,
    });
  }, 50);
});

ipcMain.handle('getTempPath', (_event, _arg) => app.getPath('temp'));

/**
 * 设置当前窗口缩放比例。
 *
 * @param {Electron.IpcMainInvokeEvent} event - 调用来源事件
 * @param {number} zoomFactor - 目标缩放比例
 * @returns {number} 实际应用的缩放比例
 */
ipcMain.handle('window:setZoomFactor', (event, zoomFactor = 1) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return 1;
  }

  const parsed = Number(zoomFactor);
  const normalized = Number.isFinite(parsed) ? parsed : 1;
  const clamped = Math.min(3, Math.max(0.5, normalized));

  window.webContents.setZoomFactor(clamped);
  return clamped;
});

ipcMain.handle('dialog:showOpenDialog', (event, options = {}) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return dialog.showOpenDialog(window, options);
});

ipcMain.handle('clipboard:writeText', async (event, text = '') => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
});

ipcMain.handle('shell:openExternal', async (event, targetUrl) => {
  const { shell } = require('electron');
  return shell.openExternal(targetUrl);
});

ipcMain.on('fs:readFileSync', (event, payload = {}) => {
  const { file, bookmark = '' } = payload;

  if (!file) {
    event.returnValue = '';
    return;
  }

  let stopAccessing;

  try {
    if (
      bookmark
      && typeof app.startAccessingSecurityScopedResource === 'function'
    ) {
      stopAccessing = app.startAccessingSecurityScopedResource(bookmark);
    }

    const content = fs.readFileSync(file);
    event.returnValue = content.toString('base64');
  } catch (error) {
    event.returnValue = '';
  } finally {
    if (typeof stopAccessing === 'function') {
      stopAccessing();
    }
  }
});

// for mac copy paset shortcut
if (process.platform === 'darwin') {
  const template = [
    // { role: 'appMenu' },
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    // { role: 'viewMenu' },
    {
      label: 'View',
      submenu: [
        ...(
          (APP_ENV === 'production') ? [] : [{ role: 'toggledevtools' }]
        ),
        { role: 'togglefullscreen' },
      ],
    },
    // { role: 'windowMenu' },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        // { role: 'window' }
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/qishibo/AnotherRedisDesktopManager');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
