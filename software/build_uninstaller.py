import os
import sys
import subprocess

def build_uninstaller_exe():
    print("[1/2] Compiling uninstall.exe with PyInstaller...")
    icon_path = os.path.abspath(os.path.join("ui", "assets", "icon.ico"))
    uninstaller_script = os.path.abspath(os.path.join("installer", "uninstall_gui.py"))

    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "uninstall",
        "--icon", icon_path,
        "--distpath", os.path.abspath("dist"),
        uninstaller_script
    ]

    res = subprocess.run(pyinstaller_cmd)
    if res.returncode != 0:
        print("[ERROR] PyInstaller compilation of uninstaller failed!")
        return False

    # Copy to dist/SentinelFlow if folder exists
    src_uninstall = os.path.join(os.getcwd(), "dist", "uninstall.exe")
    app_folder = os.path.join(os.getcwd(), "dist", "SentinelFlow")
    if os.path.exists(app_folder) and os.path.exists(src_uninstall):
        import shutil
        shutil.copy2(src_uninstall, os.path.join(app_folder, "uninstall.exe"))

    print("[2/2] Uninstaller compilation completed successfully!")
    print(f"[SUCCESS] Standalone Uninstaller created at: {src_uninstall}")
    return True

if __name__ == "__main__":
    build_uninstaller_exe()
