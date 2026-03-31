const { contextBridge, ipcRenderer } = require('electron');

const sendChannels = new Set([
  'get-all-fonts',
  'hideWindow',
  'minimizeWindow',
  'toggleMaximize',
  'update-check',
  'continue-update',
]);

const invokeChannels = new Set([
  'getMainArgs',
  'changeTheme',
  'getTempPath',
  'window:setZoomFactor',
  'dialog:showOpenDialog',
  'clipboard:writeText',
  'shell:openExternal',
]);

const syncChannels = new Set([
  'fs:readFileSync',
]);

const onChannels = new Set([
  'send-all-fonts',
  'closingWindow',
  'update-available',
  'update-not-available',
  'update-error',
  'download-progress',
  'update-downloaded',
  'os-theme-updated',
]);

const electronApi = {
  send(channel, ...args) {
    if (!sendChannels.has(channel)) {
      throw new Error(`Unsupported send channel: ${channel}`);
    }

    ipcRenderer.send(channel, ...args);
  },
  invoke(channel, ...args) {
    if (!invokeChannels.has(channel)) {
      return Promise.reject(new Error(`Unsupported invoke channel: ${channel}`));
    }

    return ipcRenderer.invoke(channel, ...args);
  },
  sendSync(channel, ...args) {
    if (!syncChannels.has(channel)) {
      throw new Error(`Unsupported sendSync channel: ${channel}`);
    }

    return ipcRenderer.sendSync(channel, ...args);
  },
  on(channel, listener) {
    if (!onChannels.has(channel)) {
      throw new Error(`Unsupported on channel: ${channel}`);
    }

    const wrapped = (event, ...args) => listener(...args);
    ipcRenderer.on(channel, wrapped);

    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', electronApi);
} else {
  window.electronAPI = electronApi;
}
