const { contextBridge, clipboard, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyText: (text) => {
    try {
      clipboard.writeText(String(text));
      return true;
    } catch (e) {
      return false;
    }
  },

  copyOriginalImage: (imagePath) => {
    try {
      return ipcRenderer.invoke('copy-original-image', imagePath);
    } catch (e) {
      console.error('Failed to copy original image:', e);
      return false;
    }
  },

  minimize: () => {
    try {
      ipcRenderer.send('minimize-window');
      return true;
    } catch (e) {
      return false;
    }
  },

  maximize: () => {
    try {
      ipcRenderer.send('maximize-window');
      return true;
    } catch (e) {
      return false;
    }
  },

  getImagePath: () => {
    try {
      return ipcRenderer.sendSync('get-image-path');
    } catch (e) {
      return null;
    }
  },

  onImagePathUpdate: (callback) => {
    try {
      ipcRenderer.on('image-path-updated', (event, path) => callback(path));
      return true;
    } catch (e) {
      return false;
    }
  },

  removeAllListeners: (channel) => {
    try {
      ipcRenderer.removeAllListeners(channel);
      return true;
    } catch (e) {
      return false;
    }
  }
});
