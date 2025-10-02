const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (event, ...args) => callback(...args)),
  signalImageReady: () => ipcRenderer.send('image-ready'),
  cropAndSave: (cropData) => ipcRenderer.send('crop-and-save', cropData),
  closeApp: () => ipcRenderer.send('close-app') // Add this line
});