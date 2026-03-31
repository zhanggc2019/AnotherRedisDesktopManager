const electronAPI = (typeof window !== 'undefined' && window.electronAPI)
  ? window.electronAPI
  : null;

function send(channel, ...args) {
  if (!electronAPI || typeof electronAPI.send !== 'function') {
    console.error(`electronAPI.send unavailable for channel "${channel}"`);
    return undefined;
  }

  return electronAPI.send(channel, ...args);
}

function invoke(channel, ...args) {
  if (!electronAPI || typeof electronAPI.invoke !== 'function') {
    return Promise.reject(new Error(`electronAPI.invoke unavailable for channel "${channel}"`));
  }

  return electronAPI.invoke(channel, ...args);
}

function sendSync(channel, ...args) {
  if (!electronAPI || typeof electronAPI.sendSync !== 'function') {
    throw new Error(`electronAPI.sendSync unavailable for sync channel "${channel}"`);
  }

  return electronAPI.sendSync(channel, ...args);
}

function on(channel, listener) {
  if (!electronAPI || typeof electronAPI.on !== 'function') {
    console.error(`electronAPI.on unavailable for channel "${channel}"`);
    return () => {};
  }

  return electronAPI.on(channel, listener);
}

export default {
  send,
  invoke,
  on,
  showOpenDialog(options = {}) {
    return invoke('dialog:showOpenDialog', options);
  },
  writeText(text = '') {
    return invoke('clipboard:writeText', text ? text.toString() : '');
  },
  openExternal(url) {
    return invoke('shell:openExternal', url);
  },
  /**
   * 设置页面缩放比例。
   *
   * @param {number} zoomFactor - 目标缩放比例
   * @returns {Promise<number>} 实际应用的缩放比例
   */
  setZoomFactor(zoomFactor = 1) {
    const parsed = Number(zoomFactor);
    const normalized = Number.isFinite(parsed) ? parsed : 1;
    return invoke('window:setZoomFactor', normalized);
  },
  readFileSync(file, bookmark = '') {
    const contentBase64 = sendSync('fs:readFileSync', { file, bookmark });

    if (!contentBase64) {
      return undefined;
    }

    return Buffer.from(contentBase64, 'base64');
  },
};
