// Modules to control application life and create native browser window
const {
  app, BrowserWindow, Menu, ipcMain, dialog, nativeTheme,
} = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
// eslint-disable-next-line no-unused-vars
const fontManager = require('../../pack/electron/font-manager');
const winState = require('../../pack/electron/win-state');

// disable GPU for some white screen issues
// app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu');

global.APP_ENV = (process.env.ARDM_ENV === 'development') ? 'development' : 'production';
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

function createWindow() {
  // get last win stage
  const lastWinStage = winState.getLastState();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: lastWinStage.x,
    y: lastWinStage.y,
    width: lastWinStage.width,
    height: lastWinStage.height,
    icon: path.join(__dirname, '../../pack/electron/icons/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (lastWinStage.maximized) {
    mainWindow.maximize();
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
    mainWindow.loadURL(url.format({
      protocol: 'http',
      host: 'localhost:9988',
      query: { version: app.getVersion(), dark: nativeTheme.shouldUseDarkColors },
    }));
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
app.on('ready', createWindow);

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
