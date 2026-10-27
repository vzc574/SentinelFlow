import os
import sys
import subprocess
import shutil

def build_sentinelflow_exe():
    print("[1/3] Preparing build environment...")
    dist_dir = os.path.join(os.getcwd(), "dist")
    build_dir = os.path.join(os.getcwd(), "build")
    
    icon_path = os.path.abspath(os.path.join("ui", "assets", "icon.ico"))
    ui_data_path = f"{os.path.abspath('ui')};ui"

    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",                # Generate full bundle folder for fast launch & installer packing
        "--windowed",              # No console window (GUI app)
        "--name", "SentinelFlow",
        "--icon", icon_path,
        "--add-data", ui_data_path,
        "--hidden-import", "webview",
        "--hidden-import", "pystray",
        "--hidden-import", "watchdog",
        "--hidden-import", "pefile",
        "--hidden-import", "psutil",
        "--hidden-import", "PIL",
        "--hidden-import", "plyer",
        "--hidden-import", "win32api",
        "--hidden-import", "win32con",
        "--hidden-import", "win32gui",
        "app.py"
    ]

    print("[2/3] Compiling SentinelFlow.exe with PyInstaller...")
    res = subprocess.run(pyinstaller_cmd)
    if res.returncode != 0:
        print("[ERROR] PyInstaller compilation failed!")
        return False

    print("[3/3] PyInstaller build completed successfully!")
    out_path = os.path.join(dist_dir, "SentinelFlow", "SentinelFlow.exe")
    print(f"[SUCCESS] Standalone Executable created at: {out_path}")
    return True

if __name__ == "__main__":
    build_sentinelflow_exe()
