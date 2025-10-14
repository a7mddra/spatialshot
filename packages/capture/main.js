const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { exec, execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const sharp = require('sharp');

let screenshotBuffer = null;

if (!app.requestSingleInstanceLock()) {
    app.quit();
}

/**
 * Check whether a command exists in PATH.
 * Works cross-platform: 'where' on win32, 'which' elsewhere.
 * @param {string} cmd
 * @returns {Promise<boolean>}
 */
function commandExists(cmd) {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            execFile('where', [cmd], (err) => resolve(!err));
        } else {
            execFile('which', [cmd], (err) => resolve(!err));
        }
    });
}

/**
 * Helper to read temp screenshot and remove file.
 */
async function processScreenshotFile(tempPath) {
    try {
        const buffer = await fs.readFile(tempPath);
        await fs.unlink(tempPath).catch(() => {}); 
        return buffer;
    } catch (err) {
        
        throw err;
    }
}

/**
 * Take a screenshot of the full virtual screen across all monitors.
 * Uses appropriate native utilities per platform with fallbacks.
 * Resolves Buffer of PNG image.
 */
function takeScreenshot() {
    return new Promise(async (resolve, reject) => {
        const tempPath = path.join(os.tmpdir(), `freeze-screen-${Date.now()}.png`);

        try {
            if (process.platform === 'linux') {
                const isWayland = !!process.env.WAYLAND_DISPLAY;
                const hasPactl = await commandExists('pactl');

                const tryUnmute = () => {
                    if (hasPactl) {
                        exec('pactl set-sink-mute @DEFAULT_SINK@ 0', (err) => {
                            if (err) console.error('Failed to unmute system sound:', err.message);
                        });
                    }
                };

                if (isWayland) {
                    
                    const hasGnome = await commandExists('gnome-screenshot');
                    const hasGrim = await commandExists('grim');

                    if (!hasGnome && !hasGrim) {
                        return reject(new Error('No Wayland screenshot tool found: please install gnome-screenshot or grim.'));
                    }

                    if (hasPactl) {
                        exec('pactl set-sink-mute @DEFAULT_SINK@ 1', (muteError) => {
                            if (muteError) {
                                console.warn('Could not mute system sound (non-fatal):', muteError.message);
                            }
                            
                            const runner = hasGnome
                                ? (cb) => execFile('gnome-screenshot', ['-f', tempPath], cb)
                                : (cb) => execFile('grim', [tempPath], cb);

                            runner(async (err) => {
                                tryUnmute();
                                if (err) {
                                    console.error((hasGnome ? 'gnome-screenshot' : 'grim') + ' failed:', err.message);
                                    return reject(err);
                                }
                                try {
                                    const buf = await processScreenshotFile(tempPath);
                                    return resolve(buf);
                                } catch (fsErr) {
                                    return reject(fsErr);
                                }
                            });
                        });
                    } else {
                        
                        const runner = hasGnome
                            ? (cb) => execFile('gnome-screenshot', ['-f', tempPath], cb)
                            : (cb) => execFile('grim', [tempPath], cb);

                        runner(async (err) => {
                            if (err) {
                                console.error((hasGnome ? 'gnome-screenshot' : 'grim') + ' failed:', err.message);
                                return reject(err);
                            }
                            try {
                                const buf = await processScreenshotFile(tempPath);
                                return resolve(buf);
                            } catch (fsErr) {
                                return reject(fsErr);
                            }
                        });
                    }
                } else {
                    
                    const hasScrot = await commandExists('scrot');
                    const hasImport = await commandExists('import');

                    if (hasScrot) {
                        execFile('scrot', [tempPath, '-o', '-z'], async (err) => {
                            if (err) {
                                console.error('scrot failed:', err.message);
                                return reject(err);
                            }
                            try {
                                const buf = await processScreenshotFile(tempPath);
                                return resolve(buf);
                            } catch (fsErr) {
                                return reject(fsErr);
                            }
                        });
                    } else if (hasImport) {
                        execFile('import', ['-window', 'root', tempPath], async (err) => {
                            if (err) {
                                console.error('imagemagick import failed:', err.message);
                                return reject(err);
                            }
                            try {
                                const buf = await processScreenshotFile(tempPath);
                                return resolve(buf);
                            } catch (fsErr) {
                                return reject(fsErr);
                            }
                        });
                    } else {
                        return reject(new Error('No X11 screenshot tool found: please install scrot or imagemagick (import).'));
                    }
                }
            } else if (process.platform === 'darwin') {
                
                execFile('screencapture', ['-x', tempPath], async (err) => {
                    if (err) {
                        console.error('screencapture failed to execute:', err.message);
                        return reject(err);
                    }
                    try {
                        const buf = await processScreenshotFile(tempPath);
                        return resolve(buf);
                    } catch (fsErr) {
                        return reject(fsErr);
                    }
                });
            } else if (process.platform === 'win32') {
            
                const escaped = tempPath.replace(/'/g, "''");
                const psPathLiteral = `'${escaped}'`;

                const script = [
                    'Add-Type -AssemblyName System.Windows.Forms,System.Drawing;',
                    '$vs = [System.Windows.Forms.SystemInformation]::VirtualScreen;',
                    '$bmp = New-Object System.Drawing.Bitmap $vs.Width, $vs.Height;',
                    '$gfx = [System.Drawing.Graphics]::FromImage($bmp);',
                    '$gfx.CopyFromScreen($vs.X, $vs.Y, 0, 0, $vs.Size);',
                    `$bmp.Save(${psPathLiteral});`,
                    '$gfx.Dispose(); $bmp.Dispose();'
                ].join(' ');

                execFile('powershell', ['-NoProfile', '-Command', script], async (err) => {
                    if (err) {
                        console.error('PowerShell screenshot command failed:', err.message);
                        return reject(err);
                    }
                    try {
                        const buf = await processScreenshotFile(tempPath);
                        return resolve(buf);
                    } catch (fsErr) {
                        return reject(fsErr);
                    }
                });
            } else {
                return reject(new Error(`Unsupported platform: ${process.platform}`));
            }
        } catch (outerErr) {
            return reject(outerErr);
        }
    });
}

/**
 * Create a borderless fullscreen BrowserWindow on each display and send the screenshot data to the renderer.
 */
async function createFreezeWindows() {
    try {
        console.log(`Taking screenshot on ${process.platform}...`);
        screenshotBuffer = await takeScreenshot();
        const screenshotDataURL = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

        console.log("Screenshot captured. Creating windows...");

        const displays = screen.getAllDisplays();
        for (const display of displays) {
            const win = new BrowserWindow({
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height,
                frame: false,
                fullscreen: true,
                alwaysOnTop: true,
                skipTaskbar: true,
                show: false, 
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

        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) {
             console.error("Could not find the sender window.");
             return app.quit();
        }
        const displayBounds = senderWindow.getBounds();
        const metadata = await sharp(screenshotBuffer).metadata();
        const finalLeft = Math.round(displayBounds.x + Math.max(0, cropData.x));
        const finalTop = Math.round(displayBounds.y + Math.max(0, cropData.y));
        const maxPossibleWidth = metadata.width - finalLeft;
        const maxPossibleHeight = metadata.height - finalTop;
        const finalWidth = Math.min(Math.round(cropData.width), maxPossibleWidth);
        const finalHeight = Math.min(Math.round(cropData.height), maxPossibleHeight);
        
        if (finalWidth < 1 || finalHeight < 1) {
            console.log("Crop area has zero or invalid dimensions after clamping. Aborting.");
            return app.quit();
        }

        await sharp(screenshotBuffer)
            .extract({
                left: finalLeft,
                top: finalTop,
                width: finalWidth,
                height: finalHeight
            })
            .toFile(outputPath);

        console.log(`Cropped image saved to: ${outputPath}`);
    } catch (err) {
        console.error('Failed to crop or save image:', err);
    } finally {
        app.quit();
    }
});

ipcMain.on('close-app', () => {
    app.quit();
});

app.whenReady().then(createFreezeWindows);
app.on('will-quit', () => {});
app.on('window-all-closed', () => app.quit());
