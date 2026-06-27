$ErrorActionPreference = 'Stop'
$project = 'D:\Codex-Workspace\english-speaking-coach'
$node = 'C:\Users\阿俊\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$port = 4173
$url = "http://localhost:$port"

function Test-AppPort {
  try {
    $response = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-AppPort)) {
  Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $project -WindowStyle Hidden
  Start-Sleep -Seconds 2
}

Start-Process $url
