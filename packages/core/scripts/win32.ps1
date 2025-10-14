# --- Configuration ---
# Specifies the directory where screenshots will be saved.
$savePath = [System.Environment]::GetFolderPath('Desktop')

# Specifies the image format (e.g., Png, Jpeg, Bmp).
$imageFormat = 'Png'
# --------------------


# 1. Load the required .NET Framework assemblies.
# We need System.Windows.Forms to get screen information and System.Drawing for image manipulation.
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
}
catch {
    Write-Error "Failed to load required .NET assemblies. Please ensure you are running on a Windows system with .NET Framework."
    return
}

# 2. Get a list of all connected screens (monitors).
$screens = [System.Windows.Forms.Screen]::AllScreens

if ($screens.Count -eq 0) {
    Write-Warning "No monitors were detected."
    return
}

Write-Host "Detected $($screens.Count) monitors. Starting capture..."

# 3. Initialize a counter for the filenames.
$fileCounter = 1

# 4. Loop through each detected screen.
foreach ($screen in $screens) {
    $bounds = $screen.Bounds
    $fileName = "$($fileCounter).$($imageFormat.ToLower())"
    $filePath = Join-Path -Path $savePath -ChildPath $fileName

    Write-Host "-> Capturing Monitor $fileCounter ($($bounds.Width)x$($bounds.Height)) and saving to '$filePath'..."

    # Create a bitmap object with the dimensions of the current monitor.
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height

    # Create a graphics object from the bitmap, which will act as our canvas.
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    # Copy the screen's content into our graphics object.
    # The source is defined by the monitor's top-left corner ($bounds.Left, $bounds.Top).
    $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)

    # Save the bitmap to the specified file path and format.
    $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::$imageFormat)

    # 5. Clean up by disposing of the graphics objects to free up memory.
    # This is very important to prevent memory leaks.
    $graphics.Dispose()
    $bitmap.Dispose()

    # Increment the counter for the next filename.
    $fileCounter++
}

Write-Host "`n✅ All screenshots have been successfully saved to your desktop."