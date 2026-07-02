@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "LOCAL_NODE_DIR=%ROOT_DIR%.tools\node-v22.18.0-win-x64"
set "LOCAL_NPM=%LOCAL_NODE_DIR%\npm.cmd"
set "LOCAL_NODE=%LOCAL_NODE_DIR%\node.exe"

if exist "%LOCAL_NPM%" goto run_build

if exist "C:\Program Files\Common Files\Adobe\Creative Cloud Libraries\libs\node.exe" (
  echo [INFO] Local npm was not found.
  echo [INFO] Use Codex to install the local build toolchain first, then run this file again.
  exit /b 1
)

echo [ERROR] No local build toolchain found.
echo [ERROR] Expected: "%LOCAL_NPM%"
exit /b 1

:run_build
set "PATH=%LOCAL_NODE_DIR%;%PATH%"
cd /d "%ROOT_DIR%"

echo [INFO] Rebuilding installer from current source...
call "%LOCAL_NPM%" run desktop:build
if errorlevel 1 exit /b %errorlevel%

echo.
echo [DONE] Updated installer files are in:
echo   %ROOT_DIR%release
exit /b 0
