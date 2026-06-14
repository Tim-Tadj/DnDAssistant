@echo off
set REPO_ROOT=C:\code\DnDAssistant
set JAVA_HOME=%JAVA_HOME%
if "%JAVA_HOME%"=="" set JAVA_HOME=C:\Program Files\Java\jdk-21.0.10
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "%REPO_ROOT%"
start /B "" "%JAVA_HOME%\bin\java.exe" -jar target\dnd-assistant-1.0-SNAPSHOT.jar > %TEMP%\backend.out 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Tim\AppData\Local\Temp\opencode\wait-backend.ps1
exit /b %errorlevel%
