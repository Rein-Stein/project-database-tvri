Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$srcPath = 'C:\TUGAS KULIAH\WebSite\public\bg.png'
$outPath = 'C:\TUGAS KULIAH\WebSite\public\bg.jpg'
$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Output ("Source: " + $src.Width + "x" + $src.Height)
$maxW = 1920
if ($src.Width -le $maxW) { $maxW = $src.Width }
$ratio = $maxW / $src.Width
$w = [int][Math]::Round($src.Width * $ratio)
$h = [int][Math]::Round($src.Height * $ratio)
Write-Output ("Target: " + $w + "x" + $h)
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, 0, 0, $w, $h)
$g.DrawImage($src, 0, 0, $w, $h)
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]78)
$bmp.Save($outPath, $enc, $ep)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
"bg.jpg size KB: " + [math]::Round((Get-Item $outPath).Length / 1KB)
