const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (event, ...args) => callback(...args)),
  signalImageReady: () => ipcRenderer.send('image-ready'),
  // New function to send crop data to the main process
  cropAndSave: (cropData) => ipcRenderer.send('crop-and-save', cropData)
});