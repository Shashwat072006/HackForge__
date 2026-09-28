Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Hackforge - Starting Backend and Frontend" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

if (-not $env:JAVA_HOME) {
    $javaCmd = (Get-Command java -ErrorAction SilentlyContinue)
    if ($javaCmd) {
        $env:JAVA_HOME = (Get-Item $javaCmd.Source).Directory.Parent.FullName
    } elseif (Test-Path "C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot") {
        $env:JAVA_HOME = "C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
    } elseif (Test-Path "C:\Program Files\Java\jdk-24") {
        $env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
    }
}

Write-Host "Starting Spring Boot Backend on http://localhost:8080 ..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\leave-management" -ArgumentList "-NoExit", "-Command", "`$env:JAVA_HOME = '$env:JAVA_HOME'; .\mvnw.cmd spring-boot:run"

Write-Host "Starting React Frontend on http://localhost:3000 ..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$root\leavema" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`nBoth servers have been launched in separate windows!" -ForegroundColor Cyan
Write-Host "Backend Swagger API: http://localhost:8080/swagger-ui.html"
Write-Host "Frontend Application: http://localhost:3000"
Write-Host "========================================================" -ForegroundColor Cyan
