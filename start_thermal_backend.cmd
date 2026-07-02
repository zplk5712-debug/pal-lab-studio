@echo off
echo Starting Thermal Analysis Backend on port 8000...
"C:\Users\user\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
