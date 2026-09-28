@echo off
echo ========================================================
echo   Hackforge - Starting Backend and Frontend
echo ========================================================

if "%JAVA_HOME%"=="" (
    if exist "C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot" (
        set "JAVA_HOME=C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
    ) else if exist "C:\Program Files\Java\jdk-24" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-24"
    )
)

set "ROOT_DIR=%~dp0"

echo Starting Spring Boot Backend on http://localhost:8080 ...
start "Hackforge Backend" cmd /k "cd /d "%ROOT_DIR%leave-management" && .\mvnw.cmd spring-boot:run"

echo Starting React Frontend on http://localhost:3000 ...
start "Hackforge Frontend" cmd /k "cd /d "%ROOT_DIR%leavema" && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend Swagger API: http://localhost:8080/swagger-ui.html
echo Frontend Application: http://localhost:3000
echo ========================================================
