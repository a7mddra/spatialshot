const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
try {
  app.setAppUserModelId('com.a7md.emojiz');
} catch (e) { }

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 440,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);

  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    try { win.center(); } catch (e) { }
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

let mainWindow = null;

ipcMain.on('minimize-window', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  } catch (e) {
    console.warn('Failed to minimize window:', e && e.message);
  }
});

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
console.log('main process started, __dirname=', __dirname);
console.log('NODE_ENV=', process.env.NODE_ENV);
