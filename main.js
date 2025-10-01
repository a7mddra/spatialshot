const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const sharp = require('sharp');

// Store the screenshot buffer globally to access it for cropping
let screenshotBuffer = null;

// takeScreenshot now returns the raw image buffer instead of a data URL
function takeScreenshot() {
    return new Promise((resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), `freeze-screen-${Date.now()}.png`);
        
        execFile('scrot', [tempPath, '-o', '-z'], async (error) => {
            if (error) {
                console.error("Scrot failed to execute. Is it installed? (sudo apt install scrot)");
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
    });
}

async function createFreezeWindows() {
    try {
        console.log("Taking screenshot with scrot...");
        screenshotBuffer = await takeScreenshot(); // Store the buffer
        // Convert the buffer to a data URL for the renderer
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
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                }
            });
            win.loadFile('index.html');
            win.webContents.on('did-finish-load', () => {
                win.webContents.send('screenshot-captured', screenshotDataURL);
            });
        }
    } catch (e) {
        console.error("A critical error occurred:", e);
        app.quit();
    }
}

// When the renderer signals the image is ready, show the window
ipcMain.on('image-ready', (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        senderWindow.show();
        senderWindow.focus();
    }
});

// Listen for the crop-and-save command from the renderer
ipcMain.on('crop-and-save', async (event, cropData) => {
    if (!screenshotBuffer) {
        console.error('Screenshot buffer not available!');
        return app.quit();
    }
    try {
        const outputDir = path.join(__dirname, 'output');
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `crop-${Date.now()}.png`);
        
        // Use sharp to crop the image buffer
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
        // Quit the app after saving or on error
        app.quit();
    }
});


app.whenReady().then(createFreezeWindows);

// We no longer need manual quit shortcuts
app.on('will-quit', () => {});
app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) {
    app.quit();
}