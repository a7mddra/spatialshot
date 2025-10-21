Add-Type -AssemblyName System.Windows.Forms

$count = [System.Windows.Forms.Screen]::AllScreens.Count
if ($count -ge 1) {
    Write-Output $count
} else {
    Write-Output 1
}
