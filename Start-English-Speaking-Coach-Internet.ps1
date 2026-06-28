$ErrorActionPreference = 'Stop'

$Project = 'D:\Codex-Workspace\english-speaking-coach'
$Node = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$Cloudflared = 'D:\Codex-Workspace\tools\cloudflared\cloudflared.exe'
$LocalUrl = 'http://localhost:4173'
$Log = Join-Path $Project 'data\cloudflared-tunnel.log'
$Err = Join-Path $Project 'data\cloudflared-tunnel.err.log'

if (!(Test-Path -LiteralPath $Node)) {
  throw "Node runtime was not found: $Node"
}

if (!(Test-Path -LiteralPath $Cloudflared)) {
  throw "cloudflared was not found: $Cloudflared"
}

try {
  $health = Invoke-WebRequest -Uri "$LocalUrl/api/health" -UseBasicParsing -TimeoutSec 2
  if ($health.StatusCode -ne 200) { throw 'Health check failed.' }
} catch {
  Start-Process -FilePath $Node -ArgumentList (Join-Path $Project 'server.js') -WorkingDirectory $Project -WindowStyle Hidden
  Start-Sleep -Seconds 3
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -LiteralPath $Log -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $Err -Force -ErrorAction SilentlyContinue

Start-Process `
  -FilePath $Cloudflared `
  -ArgumentList @('tunnel', '--url', $LocalUrl, '--no-autoupdate', '--protocol', 'http2') `
  -WorkingDirectory $Project `
  -RedirectStandardOutput $Log `
  -RedirectStandardError $Err `
  -WindowStyle Hidden

$publicUrl = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $text = ''
  if (Test-Path -LiteralPath $Log) { $text += Get-Content -LiteralPath $Log -Raw -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $Err) { $text += Get-Content -LiteralPath $Err -Raw -ErrorAction SilentlyContinue }
  $match = [regex]::Match($text, 'https://[-a-z0-9]+\.trycloudflare\.com')
  if ($match.Success) {
    $publicUrl = $match.Value
    break
  }
}

if (!$publicUrl) {
  throw "Cloudflare Tunnel started, but no public URL was found yet. Check $Err"
}

Set-Clipboard -Value $publicUrl
Start-Process $publicUrl
Write-Host ''
Write-Host 'English Speaking Coach internet link:'
Write-Host $publicUrl
Write-Host ''
Write-Host 'The link has been copied to your clipboard. Keep this computer awake while using it on your phone.'
