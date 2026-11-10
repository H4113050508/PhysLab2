@echo off
setlocal
cd /d "%~dp0"

if not exist .venv (
  py -3 -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements-desktop.txt
pyinstaller --noconfirm --clean --windowed --name PhysLab --collect-all webview --hidden-import=clr --add-data "templates;templates" --add-data "static;static" desktop_launcher.py

echo.
echo Build selesai. Aplikasi ada di folder dist\PhysLab\PhysLab.exe
pause
