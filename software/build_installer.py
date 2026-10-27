import os
import sys
import shutil
import zipfile
import subprocess

def zip_dir(source_dir, output_zip):
    print(f"Compressing payload from {source_dir} to {output_zip}...")
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                zf.write(full_path, rel_path)
    print(f"Payload archive created ({os.path.getsize(output_zip) / (1024*1024):.2f} MB).")

def build_installer():
    print("==================================================")
    print("      SentinelFlow Master Release Builder         ")
    print("==================================================")

    # Step 1: Build Main App Executable
    print("\n[Step 1/4] Compiling SentinelFlow.exe...")
    build_exe_script = os.path.abspath("build_exe.py")
    res = subprocess.run([sys.executable, build_exe_script])
    if res.returncode != 0:
        print("[ERROR] Failed to compile main executable.")
        return False

    app_dist_dir = os.path.abspath(os.path.join("dist", "SentinelFlow"))
    if not os.path.exists(app_dist_dir):
        print(f"[ERROR] Distribution folder {app_dist_dir} does not exist.")
        return False

    # Step 2: Build Uninstaller Executable
    print("\n[Step 2/4] Compiling uninstall.exe...")
    build_uninstall_script = os.path.abspath("build_uninstaller.py")
    res = subprocess.run([sys.executable, build_uninstall_script])
    if res.returncode != 0:
        print("[ERROR] Failed to compile uninstaller executable.")
        return False

    # Step 3: Create payload zip
    print("\n[Step 3/4] Packing application payload (with uninstaller) for setup...")
    payload_zip = os.path.abspath(os.path.join("installer", "app_payload.zip"))
    zip_dir(app_dist_dir, payload_zip)

    # Step 4: Build Installer Executable
    print("\n[Step 4/4] Compiling SentinelFlow_Setup.exe Installer...")
    icon_path = os.path.abspath(os.path.join("ui", "assets", "icon.ico"))
    installer_script = os.path.abspath(os.path.join("installer", "installer_gui.py"))
    payload_data_path = f"{payload_zip};."

    pyinstaller_installer_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "SentinelFlow_Setup",
        "--icon", icon_path,
        "--add-data", payload_data_path,
        "--distpath", os.path.abspath("dist"),
        installer_script
    ]

    res = subprocess.run(pyinstaller_installer_cmd)
    if res.returncode != 0:
        print("[ERROR] Failed to build Installer executable.")
        return False

    setup_exe = os.path.abspath(os.path.join("dist", "SentinelFlow_Setup.exe"))
    main_exe = os.path.abspath(os.path.join("dist", "SentinelFlow", "SentinelFlow.exe"))
    uninstall_exe = os.path.abspath(os.path.join("dist", "uninstall.exe"))

    print("\n==================================================")
    print("        [SUCCESS] SENTINELFLOW BUILD COMPLETED!   ")
    print("==================================================")
    print(f"1. Standalone Application: {main_exe}")
    print(f"2. Standalone Uninstaller: {uninstall_exe}")
    print(f"3. Complete Setup Installer: {setup_exe}")
    print("==================================================")
    return True

if __name__ == "__main__":
    build_installer()
