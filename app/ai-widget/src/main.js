const { app, BrowserWindow, ipcMain, nativeImage, clipboard, session } = require('electron');
const fs = require('fs');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let currentImagePath = null;

function getImagePathFromArgs() {
  const args = process.argv.slice(1); 
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--') && 
        !args[i].includes('electron') && 
        (args[i].endsWith('.png') || args[i].endsWith('.jpg') || args[i].endsWith('.jpeg'))) {
      return args[i];
    }
  }
  return null;
}

try {
  app.setAppUserModelId('com.a7md.ai-widget');
} catch (e) { }

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 572,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    resizable: true,
    skipTaskbar: false,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webviewTag: true
    }
  });


  win.setVisibleOnAllWorkspaces(true);

  win.loadFile(path.join(__dirname, 'renderer/index.html'));

  win.once('ready-to-show', () => {
    try {
      win.center();
      win.show();
      win.focus();
      
      
      if (currentImagePath) {
        const image = nativeImage.createFromPath(currentImagePath);
        clipboard.writeImage(image);
        win.webContents.send('image-path-updated', currentImagePath);
      }
    } catch (e) { }
  });

  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

ipcMain.on('minimize-window', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  } catch (e) {
    console.warn('Failed to minimize window:', e && e.message);
  }
});

ipcMain.on('maximize-window', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  } catch (e) {
    console.warn('Failed to maximize/unmaximize window:', e && e.message);
  }
});

ipcMain.on('get-image-path', (event) => {
  event.returnValue = currentImagePath;
});

ipcMain.handle('copy-original-image', async (event, imagePath) => {
  try {
    console.log('Copying original image:', imagePath);
    
    
    if (!fs.existsSync(imagePath)) {
      console.error('Image file does not exist:', imagePath);
      return false;
    }

    
    const stats = fs.statSync(imagePath);
    if (!stats.isFile()) {
      console.error('Path is not a file:', imagePath);
      return false;
    }

    
    const image = nativeImage.createFromPath(imagePath);
    
    if (image.isEmpty()) {
      console.error('Failed to create image from path:', imagePath);
      return false;
    }

    
    clipboard.writeImage(image);
    console.log('Successfully copied original image to clipboard');
    return true;
    
  } catch (error) {
    console.error('Error in copy-original-image handler:', error);
    return false;
  }
});

ipcMain.handle('ensure-maximized', (event) => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isMaximized()) {
        mainWindow.maximize();
        console.log('Window maximized by ensure-maximized handler');
      } else {
        console.log('Window already maximized');
      }
      return true;
    }
  } catch (e) {
    console.warn('ensure-maximized failed:', e && e.message);
  }
  return false;
});

ipcMain.handle('clear-webview-cache', async (event, partition) => {
  if (!partition) return false;
  try {
    const webviewSession = session.fromPartition(partition);
    if (webviewSession) {
      await webviewSession.clearCache();
      return true;
    }
  } catch (error) {
    console.error(`Failed to clear cache for partition ${partition}:`, error);
  }
  return false;
});

app.whenReady().then(() => {
  
  currentImagePath = getImagePathFromArgs();
  
  mainWindow = createWindow();

  const googleSession = session.fromPartition('persist:google');
  googleSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    callback({ requestHeaders: details.requestHeaders });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
  
  const newImagePath = getImagePathFromArgs();
  if (newImagePath) {
    currentImagePath = newImagePath;
    if (mainWindow) {
      const image = nativeImage.createFromPath(newImagePath);
      clipboard.writeImage(image);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('image-path-updated', newImagePath);
    }
  }
});

if (process.platform !== 'darwin') {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
}

console.log('main process started, __dirname=', __dirname);
console.log('NODE_ENV=', process.env.NODE_ENV);
console.log('Image path from args:', currentImagePath);
