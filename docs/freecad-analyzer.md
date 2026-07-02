# FreeCAD analyzer bridge

This project can use an external model analyzer for STEP/STP files.

## Files

- `scripts/freecad_model_analyzer.py`
- `scripts/run_freecad_analyzer.cmd`

## What it does

The Vite API first tries an external analyzer. If no external analyzer is configured, it falls back to the built-in local parser.

The FreeCAD bridge reads a JSON payload from `stdin`:

```json
{
  "fileName": "assembly.step",
  "fileSizeBytes": 123456,
  "dataBase64": "..."
}
```

It returns JSON to `stdout`:

```json
{
  "result": {
    "modelFileName": "assembly.step",
    "modelFileType": "STEP",
    "modelAnalysisSource": "FreeCAD external analyzer",
    "modelDetectedUnit": "mm",
    "modelDetectedVolumeM3": 0.00123,
    "modelBoundingBox": "120.00 × 40.00 × 18.00 mm",
    "modelStatus": "FreeCAD analysis complete",
    "modelNotes": ["..."],
    "modelAssemblyType": "assembly",
    "modelPartCount": 2,
    "modelPartItems": [
      {
        "name": "Bracket",
        "count": 2,
        "materialKey": "al6061",
        "volumeMm3": "182340.200",
        "volumeSource": "auto"
      }
    ]
  }
}
```

## How to connect it

### Option 1: command bridge

On Windows:

```cmd
set MODEL_ANALYZER_COMMAND=C:\Users\user\OneDrive - postech.ac.kr\바탕 화면\motor-simulator-react\scripts\run_freecad_analyzer.cmd
cmd /c npm run dev
```

If FreeCAD is installed in a custom location:

```cmd
set FREECAD_CMD=C:\Program Files\FreeCAD 1.0\bin\FreeCADCmd.exe
set MODEL_ANALYZER_COMMAND=C:\Users\user\OneDrive - postech.ac.kr\바탕 화면\motor-simulator-react\scripts\run_freecad_analyzer.cmd
cmd /c npm run dev
```

### Option 2: remote analyzer

If you run the analyzer as a separate service, set:

```cmd
set MODEL_ANALYZER_URL=http://127.0.0.1:8000/analyze-model
cmd /c npm run dev
```

## Notes

- The current bridge is designed for STEP/STP solid analysis through FreeCAD.
- STL is already handled well by the built-in analyzer, so FreeCAD is most useful for STEP assemblies.
- Depending on how the CAD exported the STEP file, object grouping may need tuning later.
