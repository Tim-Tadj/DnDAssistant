<#
.SYNOPSIS
    Boots the full DnDAssistant stack on Windows: PostgreSQL (Docker), the Java
    backend, and the React frontend.

.DESCRIPTION
    Runs each step in order, failing fast if a step errors. Stop the database
    afterwards with:  docker compose -f postgres/docker-compose.yml down
#>

$ErrorActionPreference = 'Stop'

# Resolve repository root (this script lives in <root>/scripts).
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# 1. Start PostgreSQL + Adminer.
Write-Step 'Starting PostgreSQL + Adminer (docker compose up -d --build)'
docker compose -f "postgres/docker-compose.yml" up -d --build
if ($LASTEXITCODE -ne 0) { throw 'docker compose failed' }

# 2. Wait for PostgreSQL to accept connections.
Write-Step 'Waiting for PostgreSQL to become ready'
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    docker exec postgres pg_isready -U postgres -d dnd_assistant *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'PostgreSQL did not become ready in time' }
Write-Host 'PostgreSQL is ready.' -ForegroundColor Green

# 3. Build the backend and launch it in a new window.
Write-Step 'Building backend (mvn clean install)'
if (Test-Path "$RepoRoot/mvnw.cmd") { $mvn = "$RepoRoot/mvnw.cmd" } else { $mvn = 'mvn' }
& $mvn clean install
if ($LASTEXITCODE -ne 0) { throw 'Maven build failed' }

$jar = Get-ChildItem -Path "$RepoRoot/target" -Filter 'dnd-assistant-*.jar' |
    Select-Object -First 1
if (-not $jar) { throw 'No backend jar found in target/ after build' }

Write-Step "Launching backend ($($jar.Name)) in a new window"
Start-Process -FilePath 'java' -ArgumentList @(
    '-cp', $jar.FullName,
    'main.java.com.pigishentertainment.dndassistant.Main'
)

# 4. Install frontend deps (first run) and start the dev server.
if (-not (Test-Path "$RepoRoot/node_modules")) {
    Write-Step 'Installing frontend dependencies (npm install)'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}

Write-Step 'Starting frontend dev server (npm start)'
npm start
