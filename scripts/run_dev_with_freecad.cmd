@echo off
setlocal

set "ROOT_DIR=%~dp0.."
set "ANALYZER_CMD=%~dp0run_freecad_analyzer.cmd"

if not defined FREECAD_CMD (
  if exist "C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe" (
    set "FREECAD_CMD=C:\Program Files\FreeCAD 1.1\bin\freecadcmd.exe"
  ) else if exist "C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe" (
    set "FREECAD_CMD=C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe"
  ) else if exist "C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe" (
    set "FREECAD_CMD=C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe"
  )
)

if not defined MODEL_ANALYZER_COMMAND (
  set "MODEL_ANALYZER_COMMAND=%ANALYZER_CMD%"
)

echo.
echo ==========================================
echo FreeCAD-connected dev server starting
echo ==========================================
echo MODEL_ANALYZER_COMMAND=%MODEL_ANALYZER_COMMAND%
if defined FREECAD_CMD (
  echo FREECAD_CMD=%FREECAD_CMD%
) else (
  echo FREECAD_CMD is not set. Default FreeCADCmd path lookup will be used.
)
echo.

pushd "%ROOT_DIR%"
cmd /c npm run dev
popd
