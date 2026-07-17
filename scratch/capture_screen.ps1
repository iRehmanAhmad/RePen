# PowerShell Win32 screen capture via GetDC / BitBlt with Win32 Error printing
$signature = @'
[DllImport("user32.dll", SetLastError = true)]
public static extern IntPtr GetDC(IntPtr hwnd);

[DllImport("user32.dll", SetLastError = true)]
public static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern bool DeleteDC(IntPtr hdc);

[DllImport("gdi32.dll", SetLastError = true)]
public static extern bool DeleteObject(IntPtr hObject);
'@

Add-Type -MemberDefinition $signature -Name "Win32Gdi" -Namespace "Win32"

$hdcSrc = [Win32.Win32Gdi]::GetDC([IntPtr]::Zero)
if ($hdcSrc -eq [IntPtr]::Zero) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Host "GetDC(0) failed. Win32 Error: $err"
    exit 1
}

$width = 1280
$height = 720
$hdcDest = [Win32.Win32Gdi]::CreateCompatibleDC($hdcSrc)
if ($hdcDest -eq [IntPtr]::Zero) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Host "CreateCompatibleDC failed. Win32 Error: $err"
    exit 1
}

$hBitmap = [Win32.Win32Gdi]::CreateCompatibleBitmap($hdcSrc, $width, $height)
if ($hBitmap -eq [IntPtr]::Zero) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Host "CreateCompatibleBitmap failed. Win32 Error: $err"
    exit 1
}

$hOld = [Win32.Win32Gdi]::SelectObject($hdcDest, $hBitmap)

# SRCCOPY = 0x00CC0020
$res = [Win32.Win32Gdi]::BitBlt($hdcDest, 0, 0, $width, $height, $hdcSrc, 0, 0, 0x00CC0020)
if (-not $res) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Host "BitBlt failed. Win32 Error: $err"
} else {
    Write-Host "BitBlt succeeded!"
    [System.Drawing.Image]::FromHbitmap($hBitmap).Save("c:\Users\TOSHIBA\.gemini\antigravity\scratch\epic-pen-clone\screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved screenshot.png successfully."
}

[Win32.Win32Gdi]::SelectObject($hdcDest, $hOld)
[Win32.Win32Gdi]::DeleteObject($hBitmap)
[Win32.Win32Gdi]::DeleteDC($hdcDest)
[Win32.Win32Gdi]::ReleaseDC([IntPtr]::Zero, $hdcSrc)
