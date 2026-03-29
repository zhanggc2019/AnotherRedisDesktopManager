let electronModule = null;

try {
  // Renderer still runs with nodeIntegration during this upgrade phase.
  electronModule = require('electron');
} catch (error) {
  electronModule = null;
}

const electronAPI = (typeof window !== 'undefined' && window.electronAPI)
  ? window.electronAPI
  : null;

const ipcRenderer = electronModule && electronModule.ipcRenderer;
const shell = electronModule && electronModule.shell;
const webFrame = electronModule && electronModule.webFrame;
const clipboard = electronModule && electronModule.clipboard;

function send(channel, ...args) {
  if (electronAPI && typeof electronAPI.send === 'function') {
    return electronAPI.send(channel, ...args);
  }

  if (!ipcRenderer) {
    return undefined;
  }

  return ipcRenderer.send(channel, ...args);
}

function invoke(channel, ...args) {
  if (electronAPI && typeof electronAPI.invoke === 'function') {
    return electronAPI.invoke(channel, ...args);
  }

  if (!ipcRenderer) {
    return Promise.reject(new Error(`ipcRenderer unavailable for channel "${channel}"`));
  }

  return ipcRenderer.invoke(channel, ...args);
}

function sendSync(channel, ...args) {
  if (electronAPI && typeof electronAPI.sendSync === 'function') {
    return electronAPI.sendSync(channel, ...args);
  }

  if (!ipcRenderer) {
    throw new Error(`ipcRenderer unavailable for sync channel "${channel}"`);
  }

  return ipcRenderer.sendSync(channel, ...args);
}

function on(channel, listener) {
  if (electronAPI && typeof electronAPI.on === 'function') {
    return electronAPI.on(channel, listener);
  }

  if (!ipcRenderer) {
    return () => {};
  }

  const wrapped = (event, ...args) => listener(...args);
  ipcRenderer.on(channel, wrapped);

  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

export default {
  send,
  invoke,
  on,
  showOpenDialog(options = {}) {
    return invoke('dialog:showOpenDialog', options);
  },
  writeText(text = '') {
    if (clipboard) {
      clipboard.writeText(text ? text.toString() : '');
      return Promise.resolve();
    }

    return invoke('clipboard:writeText', text ? text.toString() : '');
  },
  openExternal(url) {
    if (shell) {
      return shell.openExternal(url);
    }

    return invoke('shell:openExternal', url);
  },
  setZoomFactor(zoomFactor = 1) {
    if (webFrame) {
      webFrame.setZoomFactor(zoomFactor);
    }
  },
  readFileSync(file, bookmark = '') {
    const contentBase64 = sendSync('fs:readFileSync', { file, bookmark });

    if (!contentBase64) {
      return undefined;
    }

    return Buffer.from(contentBase64, 'base64');
  },
};
