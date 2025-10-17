#!/usr/bin/env pwsh

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DpiAwareness {
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    private static readonly IntPtr DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = new IntPtr(-4);

    public static void Set() {
        try {
            SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        } catch {
            // This may fail on older Windows versions, but the script will still try to run.
        }
    }
}
"@
[DpiAwareness]::Set()

# --- Configuration ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$nircmdPath = Join-Path $scriptDir "..\..\third-party\nircmd\exe\nircmd.exe"
$outputFolder = "$env:APPDATA\spatialshot\tmp"
# ---------------------

if (-not (Test-Path -Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

Get-ChildItem -Path $outputFolder -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -ieq ".png" -or $_.Name -eq "CAPTURE_DONE" } |
    Remove-Item -Force -ErrorAction SilentlyContinue

Add-Type -AssemblyName System.Windows.Forms

$i = 1
foreach ($screen in [System.Windows.Forms.Screen]::AllScreens) {
    $b = $screen.Bounds
    $outFile = Join-Path $outputFolder "$i.png"
    & $nircmdPath savescreenshot "`"$outFile`"" $b.X $b.Y $b.Width $b.Height
    $i++
}
