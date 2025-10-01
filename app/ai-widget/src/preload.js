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

  minimize: () => {
    try {
      ipcRenderer.send('minimize-window');
      return true;
    } catch (e) {
      return false;
    }
  },

});
