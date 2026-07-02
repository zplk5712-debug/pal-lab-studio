# FreeCAD setup checklist

This checklist is for running real STEP analysis with FreeCAD on this PC.

## 1. Install FreeCAD

Install FreeCAD first.

Typical Windows path:

- `C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe`

If the path is different, note the exact location of `FreeCADCmd.exe`.

## 2. Open terminal in the project

Project path:

- `C:\Users\user\OneDrive - postech.ac.kr\바탕 화면\motor-simulator-react`

## 3. Set FreeCAD path if needed

If FreeCAD is installed in a custom folder:

```cmd
set FREECAD_CMD=C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe
```

If FreeCAD is installed in the default folder and `run_freecad_analyzer.cmd` can find it, this step can be skipped.

## 4. Start dev server with FreeCAD analyzer

Recommended:

```cmd
C:\Users\user\OneDrive - postech.ac.kr\바탕 화면\motor-simulator-react\scripts\run_dev_with_freecad.cmd
```

Manual alternative:

```cmd
set MODEL_ANALYZER_COMMAND=C:\Users\user\OneDrive - postech.ac.kr\바탕 화면\motor-simulator-react\scripts\run_freecad_analyzer.cmd
cmd /c npm run dev
```

## 5. Open app

- [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

Go to:

- `하중 계산`

Then choose:

- `모델링 파일 업로드`

## 6. Test with a STEP file

Upload a simple single-part STEP first.

Expected UI checks:

- `해석 소스` shows `FreeCAD external analyzer`
- `인식 상태` shows `FreeCAD analysis complete`
- `자동 체적` has a number
- `외곽 크기` has a size string like `120.00 x 40.00 x 18.00 mm`

## 7. Test with a STEP assembly

Upload a STEP assembly next.

Expected UI checks:

- `구조` shows `조립도 인식`
- `조립도 부품별 입력` section appears
- Some or all parts may already have `자동 인식 체적`
- User only needs to select material for auto-detected parts

## 8. If it does not work

Check these items:

- `FreeCADCmd.exe` exists
- `FREECAD_CMD` points to the correct file
- `MODEL_ANALYZER_COMMAND` points to `run_freecad_analyzer.cmd`
- Dev server was restarted after setting env vars
- The STEP file actually contains solid bodies

## 9. What fallback means

If FreeCAD is not connected, the app falls back to the built-in analyzer.

That means:

- `해석 소스` will not say `FreeCAD external analyzer`
- STEP files may only get partial metadata analysis
- Some parts may still require manual volume input

## 10. Recommended test order

1. Single-part STEP
2. Simple assembly STEP
3. Real production assembly STEP

This makes it easier to tell whether a problem is installation, file quality, or assembly complexity.
