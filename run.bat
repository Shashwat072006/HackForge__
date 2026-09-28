@echo off
echo ========================================================
echo   Hackforge - Unified Leave Management System
echo ========================================================

if "%JAVA_HOME%"=="" (
    if exist "C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot" (
        set "JAVA_HOME=C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
    ) else if exist "C:\Program Files\Java\jdk-24" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-24"
    )
)

set "ROOT_DIR=%~dp0"

echo Starting Unified Application (Frontend + Backend) on http://localhost:8080 ...
start "Hackforge Server" cmd /k "cd /d "%ROOT_DIR%leave-management" && .\mvnw.cmd spring-boot:run"

echo.
echo ========================================================
echo   Access Everything On One Link:
echo   Application (Frontend + Backend): http://localhost:8080
echo   Swagger REST API Docs:           http://localhost:8080/swagger-ui.html
echo   H2 Database Console:             http://localhost:8080/h2-console
echo ========================================================
