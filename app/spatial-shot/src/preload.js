const { contextBridge, clipboard, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyText: (text) => {
    try {
      clipboard.writeText(String(text));
      return true;
    } catch (e) {
      console.error('Failed to copy text:', e);
      return false;
    }
  },

  copyImage: (imagePath) => {
    try {
      return ipcRenderer.invoke('copy-image', imagePath);
    } catch (e) {
      console.error('Failed to copy image:', e);
      return false;
    }
  },

  minimize: () => {
    try {
      ipcRenderer.send('minimize-window');
      return true;
    } catch (e) {
      console.error('Failed to minimize window:', e);
      return false;
    }
  },

  maximize: () => {
    try {
      ipcRenderer.send('maximize-window');
      return true;
    } catch (e) {
      console.error('Failed to maximize window:', e);
      return false;
    }
  },

  getImagePath: () => {
    try {
      return ipcRenderer.sendSync('get-image-path');
    } catch (e) {
      console.error('Failed to get image path:', e);
      return null;
    }
  },

  onImagePathUpdate: (callback) => {
    try {
      ipcRenderer.on('image-path-updated', (event, path) => callback(path));
      return true;
    } catch (e) {
      console.error('Failed to set image path update listener:', e);
      return false;
    }
  },

  clearWebviewCache: (partition) => {
    try {
      return ipcRenderer.invoke('clear-webview-cache', partition);
    } catch (e) {
      console.error('Failed to clear webview cache:', e);
      return false;
    }
  },

  removeAllListeners: (channel) => {
    try {
      ipcRenderer.removeAllListeners(channel);
      return true;
    } catch (e) {
      console.error('Failed to remove all listeners:', e);
      return false;
    }
  },

  startAuth: () => {
    try {
      ipcRenderer.send('start-auth');
      return true;
    } catch (e) {
      console.error('Failed to start auth:', e);
      return false;
    }
  },

  onAuthResult: (cb) => {
    try {
      ipcRenderer.on('auth-result', (event, data) => {
        cb(data);
      });
      return true;
    } catch (e) {
      console.error('Failed to set auth result listener:', e);
      return false;
    }
  }
});
