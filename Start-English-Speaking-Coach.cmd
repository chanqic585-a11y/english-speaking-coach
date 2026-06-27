@echo off
set "PROJECT=D:\Codex-Workspace\english-speaking-coach"
set "NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "URL=http://localhost:4173"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%URL%/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  start "English Speaking Coach Server" /min "%NODE%" "%PROJECT%\server.js"
  ping 127.0.0.1 -n 3 >nul
)

start "" "%URL%"

