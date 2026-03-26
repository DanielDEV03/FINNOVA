# ============================================================
# FINNOVA - Start All Services (Local Dev)
# Corre: .\start-all.ps1
# ============================================================

$root = $PSScriptRoot

function Write-Step($msg) {
    Write-Host ""
    Write-Host "  >> $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "     OK - $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "     ERROR - $msg" -ForegroundColor Red
}

function Kill-Port($port) {
    $pids = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique
    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}

function Wait-ForPort($port, $maxSeconds = 45) {
    $elapsed = 0
    while ($elapsed -lt $maxSeconds) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", $port)
            $tcp.Close()
            return $true
        } catch {}
        Start-Sleep -Seconds 1
        $elapsed++
        Write-Host "     esperando puerto $port... ($elapsed s)" -ForegroundColor DarkGray
    }
    return $false
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   FINNOVA - Tu Copiloto Financiero" -ForegroundColor Green
Write-Host "   Iniciando todos los servicios..." -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan

# ─────────────────────────────────────────────
# 1. DOCKER - PostgreSQL
# ─────────────────────────────────────────────
Write-Step "1/4 PostgreSQL (Docker)..."

try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker no responde" }
    Write-OK "Docker ya está corriendo"
} catch {
    Write-Host "     Docker no está corriendo. Iniciando Docker Desktop..." -ForegroundColor DarkGray
    $dockerDesktop = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $dockerDesktop)) {
        $dockerDesktop = "${env:LOCALAPPDATA}\Programs\Docker\Docker\Docker Desktop.exe"
    }
    if (Test-Path $dockerDesktop) {
        Start-Process $dockerDesktop
        Write-Host "     Esperando que Docker Desktop arranque (puede tardar ~30s)..." -ForegroundColor DarkGray
        $dockerReady = $false
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 2
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { $dockerReady = $true; break }
            Write-Host "     esperando Docker... ($([int]($i*2)) s)" -ForegroundColor DarkGray
        }
        if (-not $dockerReady) {
            Write-Fail "Docker Desktop no arrancó a tiempo. Inténtalo manualmente."
            exit 1
        }
        Write-OK "Docker Desktop listo"
    } else {
        Write-Fail "No se encontró Docker Desktop. Instálalo desde https://www.docker.com/products/docker-desktop"
        exit 1
    }
}

$containerRunning = docker ps --filter "name=financialcopilot-db" --format "{{.Names}}" 2>$null
$containerExists  = docker ps -a --filter "name=financialcopilot-db" --format "{{.Names}}" 2>$null

if ($containerRunning -eq "financialcopilot-db") {
    Write-OK "PostgreSQL ya está corriendo en localhost:5432"
} elseif ($containerExists -eq "financialcopilot-db") {
    Write-Host "     Iniciando contenedor existente..." -ForegroundColor DarkGray
    docker start financialcopilot-db | Out-Null
    Start-Sleep -Seconds 3
    Write-OK "PostgreSQL iniciado en localhost:5432"
} else {
    Write-Host "     Creando contenedor PostgreSQL con docker compose..." -ForegroundColor DarkGray
    docker compose up postgres -d 2>&1 | Out-Null
    $ready = Wait-ForPort 5432 30
    if (-not $ready) {
        Write-Fail "PostgreSQL no respondió a tiempo"
        exit 1
    }
    Write-OK "PostgreSQL listo en localhost:5432"
}

# Esperar a que acepte conexiones reales
for ($i = 0; $i -lt 15; $i++) {
    docker exec financialcopilot-db pg_isready -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
}

# ─────────────────────────────────────────────
# 2. AI ENGINE (ventana minimizada)
# ─────────────────────────────────────────────
Write-Step "2/4 AI Engine (FastAPI - puerto 8001)..."

$tcpAI = $false
try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect("localhost", 8001); $t.Close(); $tcpAI = $true } catch {}

if ($tcpAI) {
    Write-OK "AI Engine ya está corriendo en http://localhost:8001"
} else {
    Write-Host "     Liberando puerto 8001 si está ocupado..." -ForegroundColor DarkGray
    Kill-Port 8001
    Start-Sleep -Seconds 1
    Write-Host "     Iniciando AI Engine..." -ForegroundColor DarkGray
    $aiCmd = "Set-Location '$root\ai-engine'; `$env:PYTHONIOENCODING='utf-8'; .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $aiCmd -WindowStyle Minimized
    $ready = Wait-ForPort 8001 30
    if ($ready) { Write-OK "AI Engine listo en http://localhost:8001" }
    else { Write-Host "     AVISO - AI Engine tardando, continuando..." -ForegroundColor DarkYellow }
}

# ─────────────────────────────────────────────
# 3. BACKEND .NET (ventana minimizada)
# ─────────────────────────────────────────────
Write-Step "3/4 Backend (.NET - puerto 5000)..."

$tcpBack = $false
try { $t = New-Object System.Net.Sockets.TcpClient; $t.Connect("localhost", 5000); $t.Close(); $tcpBack = $true } catch {}

if ($tcpBack) {
    Write-OK "Backend ya está corriendo en http://localhost:5000"
} else {
    Write-Host "     Liberando puerto 5000 si está ocupado..." -ForegroundColor DarkGray
    Kill-Port 5000
    Start-Sleep -Seconds 1
    Write-Host "     Iniciando Backend .NET..." -ForegroundColor DarkGray
    $backCmd = "Set-Location '$root\backend'; dotnet run --project src/FinancialCopilot.API/FinancialCopilot.API.csproj"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backCmd -WindowStyle Minimized
    Write-Host "     Esperando que el backend compile y arranque (puede tardar ~30s)..." -ForegroundColor DarkGray
    $ready = Wait-ForPort 5000 90
    if ($ready) { Write-OK "Backend listo en http://localhost:5000" }
    else { Write-Host "     AVISO - Backend tardando, revisa la ventana minimizada en la barra de tareas." -ForegroundColor DarkYellow }
}

# ─────────────────────────────────────────────
# 4. FRONTEND Next.js (foreground - bloquea aquí)
# ─────────────────────────────────────────────
Write-Step "4/4 Frontend (Next.js - puerto 3000)..."

$tcpFront = $false
try {
    $t = New-Object System.Net.Sockets.TcpClient; $t.Connect("localhost", 3000); $t.Close(); $tcpFront = $true
} catch {}

# ─────────────────────────────────────────────
# RESUMEN
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "   FINNOVA corriendo localmente" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host "   Frontend   -> http://localhost:3000" -ForegroundColor White
Write-Host "   Backend    -> http://localhost:5000" -ForegroundColor White
Write-Host "   AI Engine  -> http://localhost:8001" -ForegroundColor White
Write-Host "   PostgreSQL -> localhost:5432 (Docker)" -ForegroundColor White
Write-Host "   API Docs   -> http://localhost:5000/swagger" -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Ctrl+C para detener todo." -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

if ($tcpFront) {
    Write-OK "Frontend ya está corriendo en http://localhost:3000"
    Write-Host ""
    Write-Host "  Todos los servicios activos. Presiona Enter para salir." -ForegroundColor DarkGray
    Read-Host
} else {
    Write-Host "     Liberando puerto 3000 si está ocupado..." -ForegroundColor DarkGray
    Kill-Port 3000
    Start-Sleep -Seconds 1
    Write-Host "     Iniciando Frontend (este proceso queda en primer plano)..." -ForegroundColor DarkGray
    Set-Location "$root\frontend"
    npm run dev
}
