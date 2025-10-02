const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { exec, execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const sharp = require('sharp');

let screenshotBuffer = null;

function takeScreenshot() {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), `freeze-screen-${Date.now()}.png`);
        const isWayland = !!process.env.WAYLAND_DISPLAY;
        if (isWayland) {
            exec('pactl set-sink-mute @DEFAULT_SINK@ 1', (muteError) => {
                if (muteError) {
                    
                    console.warn('Could not mute system sound for screenshot:', muteError.message);
                }
                execFile('gnome-screenshot', ['-f', tempPath], async (error) => {
                    exec('pactl set-sink-mute @DEFAULT_SINK@ 0', (unmuteError) => {
                        if (unmuteError) {
                            console.error('Failed to unmute system sound:', unmuteError.message);
                        }
                    });
                    if (!error) {
                        try {
                            const fileBuffer = await fs.readFile(tempPath);
                            await fs.unlink(tempPath);
                            return resolve(fileBuffer);
                        } catch (fsError) {
                            return reject(fsError);
                        }
                    }
                    console.error('gnome-screenshot failed to execute. Please install the "gnome-screenshot" package (e.g., sudo apt install gnome-screenshot).');
                    return reject(error);
                });
            });
        }else {
            execFile('scrot', [tempPath, '-o', '-z'], async (error) => {
                if (error) {
                    console.error('scrot failed to execute. Please install the "scrot" package (e.g., sudo apt install scrot).');
                    return reject(error);
                }
                try {
                    const fileBuffer = await fs.readFile(tempPath);
                    await fs.unlink(tempPath);
                    resolve(fileBuffer);
                } catch (fsError) {
                    reject(fsError);
                }
            });
        }
    });
}

async function createFreezeWindows() {
    try {
        console.log("Taking screenshot with scrot...");
        screenshotBuffer = await takeScreenshot();
        const screenshotDataURL = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        
        console.log("Screenshot captured. Creating windows...");
        
        const displays = screen.getAllDisplays();
        for (const display of displays) {
            const win = new BrowserWindow({
                x: display.bounds.x, y: display.bounds.y,
                width: display.bounds.width, height: display.bounds.height,
                frame: false, fullscreen: true, alwaysOnTop: true,
                skipTaskbar: true, show: false,
                webPreferences: {
                    
                    preload: path.join(__dirname, './preload.js'),
                    contextIsolation: true,
                }
            });
            
            win.loadFile(path.join(__dirname, 'index.html'));
            win.webContents.on('did-finish-load', () => {
                win.webContents.send('screenshot-captured', screenshotDataURL);
            });
        }
    } catch (e) {
        console.error("A critical error occurred:", e);
        app.quit();
    }
}

ipcMain.on('image-ready', (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        senderWindow.show();
        senderWindow.focus();
    }
});

ipcMain.on('crop-and-save', async (event, cropData) => {
    if (!screenshotBuffer) {
        console.error('Screenshot buffer not available!');
        return app.quit();
    }
    try {
        
        const outputDir = path.join(__dirname, '../output');
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `crop-${Date.now()}.png`);
        
        await sharp(screenshotBuffer)
            .extract({
                left: Math.round(cropData.x),
                top: Math.round(cropData.y),
                width: Math.round(cropData.width),
                height: Math.round(cropData.height)
            })
            .toFile(outputPath);
            
        console.log(`Cropped image saved to: ${outputPath}`);
    } catch (err) {
        console.error('Failed to crop or save image:', err);
    } finally {
        app.quit();
    }
});

app.whenReady().then(createFreezeWindows);
app.on('will-quit', () => {});
app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) {
    app.quit();
}