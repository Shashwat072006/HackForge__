Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Hackforge - Unified Leave Management System" -ForegroundColor Cyan
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

Write-Host "Starting Unified Application (Frontend + Backend) on http://localhost:8080 ..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\leave-management" -ArgumentList "-NoExit", "-Command", "`$env:JAVA_HOME = '$env:JAVA_HOME'; .\mvnw.cmd spring-boot:run"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  Access Everything On One Link:" -ForegroundColor Green
Write-Host "  Application (Frontend + Backend): http://localhost:8080" -ForegroundColor White
Write-Host "  Swagger REST API Docs:           http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "  H2 Database Console:             http://localhost:8080/h2-console" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
