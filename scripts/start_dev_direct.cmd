@echo off
setlocal

set "ROOT_DIR=%~dp0.."

if exist "C:\Program Files\Common Files\Adobe\Creative Cloud Libraries\libs\node.exe" (
  set "NODE_EXE=C:\Program Files\Common Files\Adobe\Creative Cloud Libraries\libs\node.exe"
) else if exist "C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe" (
  set "NODE_EXE=C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe"
) else if exist "C:\Program Files\Autodesk\Desktop Connect\forever\node.exe" (
  set "NODE_EXE=C:\Program Files\Autodesk\Desktop Connect\forever\node.exe"
) else (
  echo Could not find a usable node.exe
  exit /b 1
)

set "VITE_ENTRY=%ROOT_DIR%\node_modules\vite\bin\vite.js"

if not exist "%VITE_ENTRY%" (
  echo Could not find Vite entry: "%VITE_ENTRY%"
  exit /b 1
)

pushd "%ROOT_DIR%"
"%NODE_EXE%" "%VITE_ENTRY%" --host 127.0.0.1 --port 5173
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
