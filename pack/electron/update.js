const { session, ipcMain, net } = require('electron');

let autoUpdater;
let mainEvent;

const update = () => {
  // Lazy load electron-updater to avoid accessing app before ready
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater;
    // disable auto download
    autoUpdater.autoDownload = false;
    bindMainListener();
  }

  ipcMain.on('update-check', (event, arg) => {
    mainEvent = event;
    autoUpdater.checkForUpdates()
      .then(() => {})
      .catch((err) => {
        // mainEvent.sender.send('update-error', err);
      });
  });

  ipcMain.on('continue-update', (event, arg) => {
    autoUpdater.downloadUpdate()
      .then(() => {})
      .catch((err) => {
        // mainEvent.sender.send('update-error', err);
      });
  });
};

function bindMainListener() {
  autoUpdater.on('checking-for-update', () => {});

  autoUpdater.on('update-available', (info) => {
    mainEvent.sender.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    mainEvent.sender.send('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    mainEvent.sender.send('update-error', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainEvent.sender.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainEvent.sender.send('update-downloaded', info);
  });
}

module.exports = update;
