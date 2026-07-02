@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

if defined FREECAD_CMD (
  set "FREECAD_EXE=%FREECAD_CMD%"
) else if exist "C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe" (
  set "FREECAD_EXE=C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe"
) else if exist "C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe" (
  set "FREECAD_EXE=C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe"
) else if exist "C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe" (
  set "FREECAD_EXE=C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe"
) else (
  set "FREECAD_EXE=FreeCADCmd.exe"
)

for %%I in ("%FREECAD_EXE%") do (
  set "FREECAD_EXE_DIR=%%~dpI"
)

set "FREECAD_ROOT=%FREECAD_EXE_DIR%"
if not exist "%FREECAD_ROOT%\bin\python.exe" (
  for %%I in ("%FREECAD_EXE_DIR%..") do (
    set "FREECAD_ROOT=%%~fI"
  )
)

set "FREECAD_PYTHON=%FREECAD_ROOT%\bin\python.exe"
set "FREECAD_APPDATA=%TEMP%\codex-freecad-appdata"

if not exist "%FREECAD_APPDATA%" (
  mkdir "%FREECAD_APPDATA%" >nul 2>nul
)

set "APPDATA=%FREECAD_APPDATA%"
set "LOCALAPPDATA=%FREECAD_APPDATA%"

if exist "%FREECAD_PYTHON%" (
  set "PATH=%FREECAD_ROOT%\bin;%PATH%"
  set "PYTHONIOENCODING=utf-8"
  set "PYTHONUTF8=1"
  "%FREECAD_PYTHON%" "%SCRIPT_DIR%freecad_model_analyzer.py"
) else (
  "%FREECAD_EXE%" "%SCRIPT_DIR%freecad_model_analyzer.py"
)
