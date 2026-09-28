@echo off
echo ========================================================
echo   Hackforge - Starting Backend and Frontend
echo ========================================================

set "JAVA_HOME=C:\Users\shash\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.8.9-hotspot"

echo Starting Spring Boot Backend on http://localhost:8080 ...
start "Hackforge Backend" cmd /k "cd leave-management && .\mvnw.cmd spring-boot:run"

echo Starting React Frontend on http://localhost:3000 ...
start "Hackforge Frontend" cmd /k "cd leavema && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend Swagger API: http://localhost:8080/swagger-ui.html
echo Frontend Application: http://localhost:3000
echo ========================================================
